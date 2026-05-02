

let socket = null;
const subscribers = new Set();
const connectionSubscribers = new Set();
let connected = false;

export const connectWebSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket('ws://localhost:8080');

  socket.onopen = () => {
    console.log('Connected to Node WebSocket Server');
    connected = true;
    connectionSubscribers.forEach(cb => cb(true));
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      subscribers.forEach(callback => callback(payload));
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };

  socket.onclose = () => {
    console.log('Disconnected from Node WebSocket Server');
    connected = false;
    connectionSubscribers.forEach(cb => cb(false));
    // Auto-reconnect after 3 seconds
    setTimeout(connectWebSocket, 3000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket Error:', error);
    connected = false;
    connectionSubscribers.forEach(cb => cb(false));
  };
};

export const subscribeToConnectionStatus = (callback) => {
  connectionSubscribers.add(callback);
  callback(connected);
  return () => connectionSubscribers.delete(callback);
};

export const subscribeToLiveUpdates = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

export const sendLiveUpdate = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn('WebSocket not connected. Unable to send update.');
  }
};
