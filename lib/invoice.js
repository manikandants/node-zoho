var qs    = require('qs'),
    http  = require('http'),
    https = require('https');

// Invoice
var Invoice = function (options) {
  options = options || {};

  this.protocol = options.protocol || 'https';
  this.host = options.host || 'invoice.zoho.com';
  this.port = options.port || (this.protocol === 'https' ? 443 : 80);

  if (!options.authtoken) {
    return console.log('Error: Zoho Invoice instance requires the parameter `authtoken` to be initialized correctly');
  }

  this.authtoken = options.authtoken;
};

// Create Record
Invoice.prototype.createRecord = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to create record' }, null);
  }

  this._request('POST', module, { JSONString: JSON.stringify(params) }, callback);
};

// Update Record
Invoice.prototype.updateRecord = function (module, id, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to update a record' }, null);
  }

  this._request('PUT', module + '/' + id, { JSONString: JSON.stringify(params) }, callback);
};

// Get Records
Invoice.prototype.getRecords = function (module, params, callback) {
  params = params || {};

  if (typeof params === 'function') {
    this._request('GET', module, {}, params);
  } else {
    this._request('GET', module, params, callback);
  }
};

// Get Record By Id
Invoice.prototype.getRecordById = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || !params.id) {
    return callback({ message: 'Error: ID required parameter missing to get record' }, null)
  }

  this._request('GET', module + '/' + params.id, params, callback);
};

// Delete Record
Invoice.prototype.deleteRecord = function (module, id, callback) {
  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to delete a record' }, null);
  }

  this._request('DELETE', module + '/' + id, {}, callback);
};


/* Private functions */

// Request
Invoice.prototype._request = function (method, endpoint, params, callback) {
  params = params || {};

  params.authtoken = this.authtoken;

  var options = {
    host: this.host,
    port: this.port,
    path: '/api/v3/' + endpoint + '?' + qs.stringify(params),
    method: method,
    headers: {
      'Content-Length': JSON.stringify(params).length
    }
  };

  var protocol = this.protocol === 'https' ? https : http;

  var req = protocol.request(options, function (res) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) { data += chunk; });
    res.on('end', function () {
      if (data) {
        data = JSON.parse(data);

        if (data.code !== 0) {
          return callback({
            code: data.code,
            message: data.message
          }, null);
        } else {
          return callback(null, data);
        }
      }

      return callback({ message: 'No content data' }, null);
    });
  });

  req.on('error', function (e) {
    return callback(e, null);
  });

  req.write(JSON.stringify(params));
  req.end();
};


module.exports = Invoice;
