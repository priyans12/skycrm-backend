const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.tenantId = decoded.tenantId;
    socket.role = decoded.role;
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

exports.init = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Authentication middleware
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`👤 User connected: ${socket.userId}`);
    
    // Join tenant room
    socket.join(`tenant-${socket.tenantId}`);
    socket.join(`user-${socket.userId}`);
    
    // Handle real-time events
    socket.on('task:update', (data) => {
      socket.to(`tenant-${socket.tenantId}`).emit('task:updated', data);
    });
    
    socket.on('customer:update', (data) => {
      socket.to(`tenant-${socket.tenantId}`).emit('customer:updated', data);
    });
    
    socket.on('support:new', (data) => {
      socket.to(`tenant-${socket.tenantId}`).emit('support:created', data);
    });
    
    socket.on('invoice:update', (data) => {
      socket.to(`tenant-${socket.tenantId}`).emit('invoice:updated', data);
    });
    
    // Typing indicators
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('typing:started', {
        userId: socket.userId,
        room: data.room
      });
    });
    
    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('typing:stopped', {
        userId: socket.userId,
        room: data.room
      });
    });
    
    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${socket.userId}`);
    });
  });
};

// Emit events from server
exports.emitToTenant = (tenantId, event, data) => {
  if (io) {
    io.to(`tenant-${tenantId}`).emit(event, data);
  }
};

exports.emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};

exports.emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Notification helpers
exports.notifyNewTask = (task) => {
  if (io && task.assignedTo) {
    io.to(`user-${task.assignedTo}`).emit('notification', {
      type: 'task',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${task.title}`,
      data: task
    });
  }
};

exports.notifyTaskUpdate = (task, updatedBy) => {
  if (io) {
    // Notify assignee
    if (task.assignedTo && task.assignedTo.toString() !== updatedBy) {
      io.to(`user-${task.assignedTo}`).emit('notification', {
        type: 'task',
        title: 'Task Updated',
        message: `Task "${task.title}" has been updated`,
        data: task
      });
    }
    
    // Notify watchers
    if (task.watchers && task.watchers.length > 0) {
      task.watchers.forEach(watcher => {
        if (watcher.toString() !== updatedBy) {
          io.to(`user-${watcher}`).emit('notification', {
            type: 'task',
            title: 'Watched Task Updated',
            message: `Task "${task.title}" has been updated`,
            data: task
          });
        }
      });
    }
  }
};

exports.notifyNewCustomer = (customer, tenantId) => {
  if (io) {
    io.to(`tenant-${tenantId}`).emit('notification', {
      type: 'customer',
      title: 'New Customer Added',
      message: `New customer "${customer.companyName}" has been added`,
      data: customer
    });
  }
};

exports.notifyInvoicePaid = (invoice, customer, tenantId) => {
  if (io) {
    io.to(`tenant-${tenantId}`).emit('notification', {
      type: 'invoice',
      title: 'Invoice Paid',
      message: `Invoice ${invoice.invoiceNumber} from ${customer.companyName} has been paid`,
      data: invoice
    });
  }
};