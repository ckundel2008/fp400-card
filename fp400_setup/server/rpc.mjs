import { randomUUID } from 'node:crypto';

// Every request opens its own local socket; never accepts an arbitrary target URL.
export function rpc(command, args = {}, timeout = 15000, WebSocketClass = WebSocket) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocketClass('ws://127.0.0.1:5581/ws');
    const id = randomUUID();
    let finished = false;
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error('controller_timeout')), timeout);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ message_id: id, command, args })));
    socket.addEventListener('message', event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.message_id !== id) return;
      // Never propagate server details: these can contain pairing credentials.
      if ('error_code' in message) finish(new Error(`controller_error_${message.error_code}`));
      else if ('result' in message) finish(null, message.result);
    });
    socket.addEventListener('error', () => finish(new Error('controller_unreachable')));
    socket.addEventListener('close', () => finish(new Error('controller_closed')));
  });
}
