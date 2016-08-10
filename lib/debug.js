'user strict';

var debug = require('debug');

module.exports = {
  crm: {
    done: debug('zoho-node:crm.done'),
    fail: debug('zoho-node:crm.fail')
  },
  creator: {
    done: debug('zoho-node:creator.done'),
    fail: debug('zoho-node:creator.fail')
  },
  invoice: {
    done: debug('zoho-node:invoice.done'),
    fail: debug('zoho-node:invoice.fail')
  }
};