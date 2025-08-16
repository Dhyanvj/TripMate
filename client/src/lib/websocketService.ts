import { toast } from "@/hooks/use-toast";

// Event types for WebSocket messages
export type WebSocketEventType = 
  'chat_message' | 
  'item_updated' | 
  'expense_added' | 
  'member_joined' | 
  'auth' | 
  'join_trip' | 
  'connected' |
  'error' |
  'typing_indicator' |
  'message_read' |
  'message_reaction' |
  'message_edit' |
  'message_delete' |
  'notification';

// Event data interface
export interface WebSocketEventData {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
}

// WebSocket message handler type
export type WebSocketEventHandler = (data: WebSocketEventData) => void;

// Connection status type
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, WebSocketEventHandler[]> = new Map();
  private reconnectHandler: (() => void) | null = null;
  private errorCount = 0;
  private maxErrorsBeforeReconnect = 3;
  private connectionToastShown = false;
  private activeConnections = 0; // Track how many components are using the connection
  private isInitialized = false; // Track if connection has been initialized
  
  // Connection status
  private _status: ConnectionStatus = 'disconnected';
  
  get connected() {
    return this._status === 'connected';
  }
  
  get status() {
    return this._status;
  }
  
  /**
   * Connect to the WebSocket server
   * @param forceReconnect Force a reconnection even if already connected
   * @returns A promise that resolves when connected
   */
  connect(forceReconnect = false): Promise<void> {
    // Return the existing connection if already connected and not forcing reconnect
    if (this.socket && this.socket.readyState === WebSocket.OPEN && !forceReconnect) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }
    
    // If we're already in the process of connecting, return a promise that resolves when connected
    if (this._status === 'connecting' && this.socket && this.socket.readyState === WebSocket.CONNECTING && !forceReconnect) {
      console.log('WebSocket already connecting, waiting for it to complete');
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this._status === 'connected') {
            clearInterval(checkInterval);
            resolve();
          } else if (this._status === 'error' || this._status === 'disconnected') {
            clearInterval(checkInterval);
            reject(new Error('Connection failed during wait'));
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Timed out waiting for connection'));
        }, 10000);
      });
    }
    
    // Clean up existing socket if needed
    if (this.socket) {
      const currentState = this.socket.readyState;
      
      // Only close if not already closing or closed
      if (currentState !== WebSocket.CLOSING && currentState !== WebSocket.CLOSED) {
        try {
          // Use a clean close code
          this.socket.close(1000, "Normal closure");
        } catch (err) {
          console.error('Error closing existing socket:', err);
        }
      }
      
      // Nullify references to prevent memory leaks
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket = null;
    }
    
    return new Promise((resolve, reject) => {
      try {
        this._status = 'connecting';
        
        // Determine the WebSocket protocol based on the current page protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws`;
        
        console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
        this.socket = new WebSocket(wsUrl);
        
        // Setup connection timeout
        const connectionTimeout = setTimeout(() => {
          console.log('WebSocket connection timed out');
          if (this.socket?.readyState !== WebSocket.OPEN) {
            this._status = 'error';
            reject(new Error('WebSocket connection timed out'));
            this.attemptReconnect();
          }
        }, 10000); // 10 second timeout
        
        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          this._status = 'connected';
          this.reconnectAttempts = 0;
          this.errorCount = 0;
          this.startPingInterval();
          
          // If we previously showed a connection error toast, show a success toast
          if (this.connectionToastShown) {
            toast({
              title: "Connection Restored",
              description: "You are now connected to the server.",
              variant: "default",
            });
            this.connectionToastShown = false;
          }
          
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as WebSocketEventData;
            this.handleEvent(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            this.errorCount++;
            
            if (this.errorCount >= this.maxErrorsBeforeReconnect) {
              console.log(`Reached max error count (${this.errorCount}), reconnecting...`);
              this.reconnect();
            }
          }
        };
        
        this.socket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this._status = 'error';
          reject(error);
        };
        
        this.socket.onclose = (event) => {
          clearTimeout(connectionTimeout);
          
          // Determine if this is a clean close (controlled by our code)
          const isCleanClose = event.code === 1000 && event.reason === "Normal closure";
          
          console.log(`WebSocket disconnected with code ${event.code}, reason: ${event.reason}, clean: ${isCleanClose}`);
          this.stopPingInterval();
          
          // Only change status and attempt reconnect if this wasn't a clean close
          // This prevents the connect/disconnect cycle
          if (!isCleanClose) {
            this._status = 'disconnected';
            
            // Only attempt to reconnect if we have active connections
            if (this.activeConnections > 0) {
              this.attemptReconnect();
            }
          }
        };
      } catch (error) {
        console.error('Error setting up WebSocket connection:', error);
        this._status = 'error';
        reject(error);
        this.attemptReconnect();
      }
    });
  }
  
  /**
   * Start ping interval to keep the connection alive
   */
  private startPingInterval() {
    this.stopPingInterval(); // Clear any existing interval
    
    // Send a ping every 25 seconds (server's ping interval is 30s)
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message
          // We'll use our custom ping message as browser WebSockets don't support ping directly
          this.send('connected', { ping: Date.now() });
        } catch (error) {
          console.error('Error sending ping:', error);
          // Only reconnect if the socket isn't already trying to reconnect
          if (this._status !== 'reconnecting') {
            this.reconnect();
          }
        }
      } else if (this._status !== 'reconnecting' && this._status !== 'connecting') {
        console.warn('Cannot send ping: WebSocket not open');
        this.reconnect();
      }
    }, 25000);
  }
  
  /**
   * Stop the ping interval
   */
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  /**
   * Force a reconnection
   */
  reconnect() {
    console.log('Forcing WebSocket reconnection');
    this._status = 'reconnecting';
    
    // Close the current socket if it exists
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {
        console.error('Error closing socket during reconnect:', err);
      }
      this.socket = null;
    }
    
    // Attempt to connect immediately
    this.connect(true).catch(err => {
      console.error('Reconnection failed:', err);
      this.attemptReconnect();
    });
  }
  
  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this._status = 'error';
      
      // Only show toast if not already shown
      if (!this.connectionToastShown) {
        toast({
          title: "Connection Error",
          description: "Not connected to server. Your changes may not be synchronized.",
          variant: "destructive",
        });
        this.connectionToastShown = true;
      }
      
      // Try one last time after 30 seconds
      setTimeout(() => {
        this.reconnectAttempts = 0;
        this.connect(true).catch(err => console.error('Final reconnection attempt failed:', err));
      }, 30000);
      
      return;
    }
    
    this.reconnectAttempts++;
    this._status = 'reconnecting';
    
    // Exponential backoff with max of 10 seconds
    const backoffTime = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    
    console.log(`Attempting to reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(true).catch(err => {
        console.error('Reconnection attempt failed:', err);
        // The onclose handler will trigger another reconnect attempt
      });
    }, backoffTime);
    
    // Call the reconnect handler if registered
    if (this.reconnectHandler) {
      this.reconnectHandler();
    }
  }
  
  /**
   * Register a reconnect handler to be notified when reconnection is attempted
   */
  onReconnecting(handler: () => void) {
    this.reconnectHandler = handler;
  }
  
  /**
   * Register a component that uses the WebSocket connection
   * This helps prevent multiple connect/disconnect cycles
   */
  registerConnection() {
    this.activeConnections++;
    console.log(`WebSocket: Component registered (total: ${this.activeConnections})`);
    
    // Check if we already have a connection, we might need to reconnect if it's broken
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Connection already active, no need to reconnect');
      return;
    }
    
    // If we're already in the process of connecting, don't attempt again
    if (this._status === 'connecting') {
      console.log('WebSocket: Already connecting, skipping duplicate connection attempt');
      return;
    }
    
    // If we're in a reconnecting state, don't interrupt it
    if (this._status === 'reconnecting') {
      console.log('WebSocket: Already reconnecting, skipping duplicate connection attempt');
      return;
    }
    
    // Initialize the connection if needed
    if (!this.isInitialized || this._status === 'disconnected' || this._status === 'error') {
      this.isInitialized = true;
      console.log('WebSocket: Initializing connection');
      this.connect();
    }
  }
  
  /**
   * Deregister a component that uses the WebSocket connection
   * Only actually disconnect when no components are using the connection anymore
   */
  deregisterConnection() {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    console.log(`WebSocket: Component deregistered (total: ${this.activeConnections})`);
    
    // Only disconnect when no components are using the connection
    if (this.activeConnections === 0) {
      this.disconnect(true);
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   * @param force Force disconnection even if other components might be using it
   */
  disconnect(force = false) {
    // Don't disconnect if there are still active connections unless forced
    if (!force && this.activeConnections > 0) {
      console.log(`WebSocket: Not disconnecting, ${this.activeConnections} connections still active`);
      return;
    }
    
    console.log('WebSocket: Disconnecting with clean close');
    this._status = 'disconnected';
    
    // Cancel any pending reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Stop the ping interval to prevent auto-reconnection
    this.stopPingInterval();
    
    // Close with clean close code (1000) and reason
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        try {
          // Clean close - our onclose handler won't attempt to reconnect
          this.socket.close(1000, "Normal closure");
        } catch (err) {
          console.error('Error during disconnect:', err);
        }
      }
      
      // Clean up event handlers
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket = null;
    }
    
    // Reset connection flags
    this.reconnectAttempts = 0;
    this.errorCount = 0;
  }
  
  /**
   * Send a message to the WebSocket server
   */
  send(type: WebSocketEventType, payload: any): boolean {
    // If socket isn't connected, try to connect first
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, attempting to connect');
      
      // Don't show error toast on every attempt, only show when actually trying to send
      if (this._status === 'error' && !this.connectionToastShown) {
        toast({
          title: "Connection Error",
          description: "Not connected to server. Your changes may not be synchronized.",
          variant: "destructive",
        });
        this.connectionToastShown = true;
      }
      
      // Try to connect and then send the message
      this.connect().then(() => {
        this.send(type, payload);
      }).catch(err => {
        console.error('Failed to connect before sending message:', err);
      });
      
      return false;
    }
    
    const message: WebSocketEventData = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      
      // Only show toast for non-ping messages
      if (type !== 'connected') {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
      
      // Try to reconnect on send error
      this.reconnect();
      return false;
    }
  }
  
  /**
   * Register an event handler
   */
  on(type: WebSocketEventType, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    
    this.eventHandlers.get(type)!.push(handler);
  }
  
  /**
   * Unregister an event handler
   */
  off(type: WebSocketEventType, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(type)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(type)!;
    const index = handlers.indexOf(handler);
    
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Handle an incoming WebSocket event
   */
  private handleEvent(data: WebSocketEventData) {
    const { type } = data;
    
    // Don't log ping/pong messages to avoid console spam
    if (type !== 'connected') {
      console.log(`Received WebSocket event: ${type}`);
    }
    
    // Special case for error events
    if (type === 'error') {
      toast({
        title: "Server Error",
        description: data.payload.message || "An error occurred on the server",
        variant: "destructive",
      });
      console.error("WebSocket error:", data.payload.message);
    }
    
    if (!this.eventHandlers.has(type)) {
      return;
    }
    
    const handlers = this.eventHandlers.get(type)!;
    
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in WebSocket event handler for type ${type}:`, error);
        toast({
          title: "Error Processing Message",
          description: "There was an error processing the latest update. Please refresh the page.",
          variant: "destructive",
        });
      }
    }
  }
}

// Create a singleton instance
export const websocketService = new WebSocketService();

export default websocketService;