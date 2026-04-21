export class MockBroadcastChannel {
  static registry = new Map<string, Set<MockBroadcastChannel>>();

  name: string;
  closed = false;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  private listeners = new Set<(event: MessageEvent<unknown>) => void>();

  constructor(name: string) {
    this.name = name;
    const channels = MockBroadcastChannel.registry.get(name) ?? new Set<MockBroadcastChannel>();
    channels.add(this);
    MockBroadcastChannel.registry.set(name, channels);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== "message") {
      return;
    }

    const callback =
      typeof listener === "function"
        ? (listener as (event: MessageEvent<unknown>) => void)
        : (event: MessageEvent<unknown>) => listener.handleEvent(event as unknown as Event);

    this.listeners.add(callback);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type !== "message") {
      return;
    }

    const callback =
      typeof listener === "function"
        ? (listener as (event: MessageEvent<unknown>) => void)
        : (event: MessageEvent<unknown>) => listener.handleEvent(event as unknown as Event);

    this.listeners.delete(callback);
  }

  postMessage(data: unknown) {
    if (this.closed) {
      throw new DOMException("Channel is closed", "InvalidStateError");
    }

    const peers = [...(MockBroadcastChannel.registry.get(this.name) ?? [])].filter(
      (channel) => channel !== this && !channel.closed,
    );

    queueMicrotask(() => {
      for (const peer of peers) {
        const event = { data } as MessageEvent<unknown>;

        for (const listener of peer.listeners) {
          listener(event);
        }

        peer.onmessage?.(event);
      }
    });
  }

  close() {
    this.closed = true;
    MockBroadcastChannel.registry.get(this.name)?.delete(this);
  }

  static reset() {
    MockBroadcastChannel.registry.clear();
  }
}
