var qs = require('qs');
var fs = require('fs');
var http = require('http');
var https = require('https');
var querystring = require('querystring');

// Creator
var Creator = function(options) {
  options = options || {};

  this.cookie = false;
  this.protocol = options.protocol || 'https';
  this.host = options.host || 'creator.zoho.com';
  this.port = options.port || (this.protocol === 'https' ? 443 : 80);

  if (!options.authtoken) {
    return console.error('authtoken is missing during creation');
  }

  this.authtoken = options.authtoken;
  this.scope = options.scope || 'creatorapi';
};

// Set cookie
Creator.prototype.setCookie = function(cookie) {
  this.cookie = cookie;
};

// Add Records
// See https://www.zoho.com/creator/help/api/rest-api/rest-api-add-records.html
Creator.prototype.addRecords = function(applicationName, formName, params, callback) {
  params = params || {};

  var endpoint = applicationName + '/form/' + formName + '/record/add/';

  if (typeof params === 'function') {
    this._request('POST', endpoint, {}, params);
  } else {
    this._request('POST', endpoint, params, callback);
  }
};

// Edit Records
// See https://www.zoho.com/creator/help/api/rest-api/rest-api-edit-records.html
Creator.prototype.editRecords = function(applicationName, formName, params, callback) {
  params = params || {};

  var endpoint = applicationName + '/form/' + formName + '/record/update/';

  console.log(endpoint);

  if (typeof params === 'function') {
    this._request('POST', endpoint, {}, params);
  } else {
    this._request('POST', endpoint, params, callback);
  }
};

// Delete Records
// See https://www.zoho.com/creator/help/api/rest-api/rest-api-delete-records.html
Creator.prototype.deleteRecords = function(applicationName, formName, params, callback) {
  params = params || {};

  var endpoint = applicationName + '/form/' + formName + '/record/delete/';

  if (typeof params === 'function') {
    this._request('POST', endpoint, {}, params);
  } else {
    this._request('POST', endpoint, params, callback);
  }
};

// Get Records in View
// See https://www.zoho.com/creator/help/api/rest-api/rest-api-view-records-in-view.html
Creator.prototype.viewRecordsInView = function(applicationLinkName, viewLinkName, params, callback) {
  params = params || {};

  var endpoint = applicationLinkName + '/view/' + viewLinkName;

  if (typeof params === 'function') {
    this._request('GET', endpoint, {}, params);
  } else {
    this._request('GET', endpoint, params, callback);
  }
};

// List records in view
// See https://www.zoho.com/creator/help/api/rest-api/rest-api-list-form-fields.html
Creator.prototype.listFormFields = function(applicationLinkName, viewLinkName, params, callback) {
  params = params || {};

  var endpoint = applicationLinkName + '/view/' + viewLinkName;

  if (typeof params === 'function') {
    this._request('GET', endpoint, {}, params);
  } else {
    this._request('GET', endpoint, params, callback);
  }
};

// Get image
// Zoho doesn't support downloading images from the REST API.  But, images are accessible against a hardcoded URL 
Creator.prototype.downloadImage = function(endpoint, params, callback) {
  params = params || {};

  this.host = 'creatorexport.zoho.com';

  params.download = true;

  if (typeof params === 'function') {
    this._request('GET', endpoint, {}, params);
  } else {
    this._request('GET', endpoint, params, callback);
  }
};


/* Private functions */

// Build XML data
Creator.prototype._build = function(module, data) {
  var records = data instanceof Array ? data : [data];

  var xml = '<' + module + '>';
  records.forEach(function(params, index) {
    xml += '<row no="' + (index + 1) + '">';
    for (var param in params) {
      if (params.hasOwnProperty(param)) {
        xml += '<FL val="' + param + '"><![CDATA[' + params[param] + ']]></FL>';
      }
    }
    xml += '</row>';
  });
  xml += '</' + module + '>';

  return xml;
};

// Request
Creator.prototype._request = function(method, endpoint, params, callback) {
  params = params || {};

  params.authtoken = this.authtoken;
  params.scope = this.scope;
  params.raw = true;

  var path = (params.hasOwnProperty('download')) ? endpoint + '?' + qs.stringify(params) : '/api/json/' + endpoint + '?' + querystring.unescape(qs.stringify(params));
  delete params.path;

  var options = {
    host: this.host,
    port: this.port,
    path: path,
    method: method,
    headers: {
      'Content-Length': JSON.stringify(params).length
    }
  };

  options.headers.Cookie = this.cookie;
  //options.headers['Connection'] = "keep-alive";

  if (params.hasOwnProperty('download')) {
    options.headers['Content-disposition'] = 'attachment; filename=1427150341594_image.JPG';
    options.headers['Content-type'] = 'image/jpeg';
  }

  var protocol = this.protocol === 'https' ? https : http;

  var req = protocol.request(options, function(res) {

    var chunks = [];

    if (params.hasOwnProperty('download')) {
      res.setEncoding('binary');

    } else {
      res.setEncoding('utf8');
    }

    res.on('data', function(chunk) {
      chunks.push(new Buffer(chunk, 'binary'));
    });
    res.on('end', function() {
      //var buffer = new Buffer();
      var data = Buffer.concat(chunks);
      if (data) {
        if (params.hasOwnProperty('download')) {
          // binary
          return callback(null, data);
        } else {

          // json
          try {
            data = JSON.parse(data);
          } catch (e) {
            data = {};
          }

          if (data.message) {
            return callback({
              code: data.code,
              message: data.message
            }, null);
          } else {
            return callback(null, data);
          }

        }

      } else {
        return callback({
          message: 'No content data'
        }, null);
      }

    });
  });

  req.on('error', function(e) {
    return callback(e, null);
  });

  req.write(JSON.stringify(params));
  req.end();
};

module.exports = Creator;
