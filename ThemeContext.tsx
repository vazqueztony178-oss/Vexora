import { getSupabase } from '@/lib/supabase';
import type { CallSignal, CallType } from '@/types';

export type SignalHandler = (signal: CallSignal) => void;

interface CallPeer {
  pc: RTCPeerConnection;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type SupabaseChannel = NonNullable<ReturnType<typeof getSupabase>>['channel'] extends (...a: infer A) => infer R ? R : never;

export class WebRTCManager {
  private peer: CallPeer | null = null;
  private channel: SupabaseChannel | null = null;
  private callId: string | null = null;
  private myUserId: string | null = null;
  private otherUserId: string | null = null;
  private handlers: Set<SignalHandler> = new Set();
  private pendingCandidates: Array<{ candidate: RTCIceCandidateInit }> = [];

  private getChannelName(callId: string): string {
    return `call:${callId}`;
  }

  subscribe(myUserId: string): void {
    this.myUserId = myUserId;
  }

  onSignal(handler: SignalHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(signal: CallSignal): void {
    this.handlers.forEach((h) => h(signal));
  }

  private async sendSignal(signal: Omit<CallSignal, 'fromUserId'>): Promise<void> {
    if (!this.myUserId || !this.callId || !this.channel) return;
    const full: CallSignal = { ...signal, fromUserId: this.myUserId };
    try {
      await this.channel.send({ type: 'broadcast', event: 'signal', payload: full });
    } catch (err) {
      console.warn('[WebRTC] sendSignal failed:', err);
    }
  }

  joinCall(callId: string, otherUserId: string): void {
    const sb = getSupabase();
    if (!sb) return;
    this.callId = callId;
    this.otherUserId = otherUserId;
    this.channel = sb.channel(this.getChannelName(callId), {
      config: { broadcast: { self: false }, presence: { key: this.myUserId ?? '' } },
    });
    this.channel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: CallSignal }) => {
      if (payload.toUserId !== this.myUserId) return;
      this.handleIncomingSignal(payload);
    });
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try { await this.channel?.track({ userId: this.myUserId }); } catch { /* ignore */ }
      }
    });
  }

  private async handleIncomingSignal(signal: CallSignal): Promise<void> {
    if (!this.peer) {
      this.emit(signal);
      return;
    }
    const pc = this.peer.pc;
    try {
      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        this.flushPendingCandidates();
        this.emit(signal);
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        this.flushPendingCandidates();
        this.emit(signal);
      } else if (signal.type === 'ice-candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          this.pendingCandidates.push({ candidate });
        }
      } else {
        this.emit(signal);
      }
    } catch (err) {
      console.warn('[WebRTC] signal error:', err);
    }
  }

  private flushPendingCandidates(): void {
    if (!this.peer) return;
    this.pendingCandidates.forEach(async ({ candidate }) => {
      try {
        await this.peer!.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] flush candidate error:', err);
      }
    });
    this.pendingCandidates = [];
  }

  async getLocalStream(type: CallType): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async getScreenStream(): Promise<MediaStream | null> {
    try {
      return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch {
      return null;
    }
  }

  async createPeer(initiator: boolean, localStream: MediaStream): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    this.peer = { pc, localStream, remoteStream: new MediaStream() };

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      if (!this.peer) return;
      e.streams[0].getTracks().forEach((track) => {
        this.peer!.remoteStream?.addTrack(track);
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && this.callId && this.otherUserId) {
        this.sendSignal({
          type: 'ice-candidate',
          toUserId: this.otherUserId,
          callId: this.callId,
          callType: 'audio',
          candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex },
        });
      }
    };

    if (initiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      if (this.callId && this.otherUserId) {
        await this.sendSignal({
          type: 'offer',
          toUserId: this.otherUserId,
          callId: this.callId,
          callType: 'audio',
          sdp: offer.sdp,
        });
      }
    }

    return pc;
  }

  async createAnswer(): Promise<void> {
    if (!this.peer) return;
    const answer = await this.peer.pc.createAnswer();
    await this.peer.pc.setLocalDescription(answer);
    if (this.callId && this.otherUserId) {
      await this.sendSignal({
        type: 'answer',
        toUserId: this.otherUserId,
        callId: this.callId,
        callType: 'audio',
        sdp: answer.sdp,
      });
    }
  }

  getRemoteStream(): MediaStream | null {
    return this.peer?.remoteStream ?? null;
  }

  toggleMute(muted: boolean): void {
    this.peer?.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  toggleCamera(off: boolean): void {
    this.peer?.localStream?.getVideoTracks().forEach((t) => (t.enabled = !off));
  }

  async switchCamera(): Promise<MediaStream | null> {
    if (!this.peer?.localStream) return null;
    const oldVideo = this.peer.localStream.getVideoTracks()[0];
    if (!oldVideo) return null;
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: oldVideo.getSettings().facingMode === 'user' ? 'environment' : 'user' },
    });
    const newVideo = newStream.getVideoTracks()[0];
    const sender = this.peer.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(newVideo);
    oldVideo.stop();
    this.peer.localStream.removeTrack(oldVideo);
    this.peer.localStream.addTrack(newVideo);
    return this.peer.localStream;
  }

  async startScreenShare(): Promise<MediaStream | null> {
    if (!this.peer?.localStream) return null;
    const screenStream = await this.getScreenStream();
    if (!screenStream) return null;
    const screenTrack = screenStream.getVideoTracks()[0];
    const sender = this.peer.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(screenTrack);
    screenTrack.onended = () => {
      this.toggleCamera(false);
    };
    return screenStream;
  }

  sendCallStart(type: CallType): void {
    if (!this.callId || !this.otherUserId) return;
    this.sendSignal({ type: 'call-start', toUserId: this.otherUserId, callId: this.callId, callType: type });
  }

  sendCallAccept(): void {
    if (!this.callId || !this.otherUserId) return;
    this.sendSignal({ type: 'call-accept', toUserId: this.otherUserId, callId: this.callId, callType: 'audio' });
  }

  sendCallReject(): void {
    if (!this.callId || !this.otherUserId) return;
    this.sendSignal({ type: 'call-reject', toUserId: this.otherUserId, callId: this.callId, callType: 'audio' });
  }

  sendCallEnd(): void {
    if (!this.callId || !this.otherUserId) return;
    this.sendSignal({ type: 'call-end', toUserId: this.otherUserId, callId: this.callId, callType: 'audio' });
  }

  sendMediaState(muted: boolean, cameraOff: boolean): void {
    if (!this.callId || !this.otherUserId) return;
    this.sendSignal({ type: 'media-state', toUserId: this.otherUserId, callId: this.callId, callType: 'audio', mediaState: { muted, cameraOff } });
  }

  close(): void {
    this.peer?.localStream?.getTracks().forEach((t) => t.stop());
    this.peer?.pc.close();
    this.peer = null;
    const sb = getSupabase();
    if (this.channel && sb) {
      try { sb.removeChannel(this.channel); } catch { /* ignore */ }
    }
    this.channel = null;
    this.callId = null;
    this.otherUserId = null;
    this.pendingCandidates = [];
  }
}

export const webrtc = new WebRTCManager();

let incomingCallUnsub: (() => void) | null = null;

export function listenForIncomingCalls(
  myUserId: string,
  onIncoming: (signal: CallSignal) => void,
): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  if (incomingCallUnsub) incomingCallUnsub();
  const channelName = `calls:${myUserId}`;
  const ch = sb.channel(channelName, { config: { broadcast: { self: false } } });
  ch.on('broadcast', { event: 'incoming-call' }, ({ payload }: { payload: CallSignal }) => {
    if (payload.toUserId === myUserId) onIncoming(payload);
  });
  ch.subscribe();
  incomingCallUnsub = () => {
    try { sb.removeChannel(ch); } catch { /* ignore */ }
    incomingCallUnsub = null;
  };
  return incomingCallUnsub;
}

export async function sendIncomingCallNotification(signal: CallSignal): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const channelName = `calls:${signal.toUserId}`;
  const ch = sb.channel(channelName, { config: { broadcast: { self: false } } });
  await new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
    });
  });
  try {
    await ch.send({ type: 'broadcast', event: 'incoming-call', payload: signal });
  } catch (err) {
    console.warn('[WebRTC] incoming call notification failed:', err);
  }
  try { sb.removeChannel(ch); } catch { /* ignore */ }
}
