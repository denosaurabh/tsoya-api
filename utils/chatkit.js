const Chatkit = require('@pusher/chatkit-server');

// eslint-disable-next-line new-cap
module.exports = new Chatkit.default({
  instanceLocator: process.env.PUSHER_INSTANCE_LOCATOR,
  key: process.env.PUSHER_SECRET_KEY
});
