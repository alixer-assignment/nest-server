db = db.getSiblingDB('backend');

db.createUser({
  user: 'backend_user',
  pwd: 'backend_password',
  roles: [
    {
      role: 'readWrite',
      db: 'backend'
    }
  ]
});

db.createCollection('users');
db.createCollection('rooms');
db.createCollection('messages');

db.users.createIndex({ email: 1 }, { unique: true });
db.rooms.createIndex({ name: 1 });
db.messages.createIndex({ roomId: 1, createdAt: 1 });
db.messages.createIndex({ userId: 1 });

print('MongoDB initialization completed successfully!');
