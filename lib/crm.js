'use strict';

var qs    = require('qs'),
    http  = require('http'),
    https = require('https'),
    debug = require('./debug');

/**
* @class CRM
* Wraps CRUD methods for Zoho API records (modules), all params are expressed in
* JSON, this class transform the Object JSON to XML and sends requests to API, for
* more details about each module and their fields plase check out
* {@link https://www.zoho.com/crm/help/api/modules-fields.html}
* @param {Object} options
* @param {String} options.protocol - Http protocol, default: https
* @param {String} options.host - url , default: crm.zoho.com
* @param {String} options.authtoken - Token
* @param {String} options.port - Http port
* @param {String} options.scope - Zoho API scope, default: crmapi
*/
var CRM = function (options) {
  options = options || {};

  this.protocol = options.protocol || 'https';
  this.host = options.host || 'crm.zoho.com';
  this.port = options.port || (this.protocol === 'https' ? 443 : 80);

  if (!options.authtoken) {
    return console.log('Error: Zoho CRM instance requires the parameter `authtoken` to be initialized correctly');
  }

  this.authtoken = options.authtoken;
  this.scope = options.scope || 'crmapi';
};

/**
* Get Record
* Sends getRecords request
* @param {String} module - Zoho module
* @param {Object} params -  Data to send (expressed in JSON)
* @param {Function} callback -
*/
CRM.prototype.getRecords = function (module, params, callback) {
  params = params || {};

  module = module.charAt(0).toUpperCase() + module.slice(1);

  var endpoint = module + '/getRecords';

  if (typeof params === 'function') {
    this._request('GET', endpoint, {}, params);
  } else {
    this._request('GET', endpoint, params, callback);
  }
};

/**
* Get Record By Id
* Sends getRecordById request
* @param {String} module - Zoho module
* @param {Object} params -  Data to send (expressed in JSON)
* @param {Function} callback -
*/
CRM.prototype.getRecordById = function (module, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || !params.id) {
    return callback({ message: 'Error: ID required parameter missing to get record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  this._request('GET', module + '/getRecordById', params, callback);
};

/**
* Create Record
* Builds xml and sends insertRecords request
* @param {String} module - Zoho module
* @param {Object} params -  Data to send (expressed in JSON)
* @param {Function} callback -
*/
CRM.prototype.createRecord = function (module, payload, params, callback) {
  params = params || {};
  payload = payload || {};

  if (typeof payload !== 'object' || Object.keys(payload).length === 0) {
    return callback({ message: 'Error: params object required to create record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  var xml = this._build(module, payload);
  params.xmlData = xml;

  this._request('GET', module + '/insertRecords', params, callback);
};

/**
* Create a note for specific object
* Builds xml and sends insertRecords request for 'Notes'
* @param {String} id - Object identificator
* @param {String} title -  Title for note
* @param {String} content -  Note content
* @param {Function} callback -
*/
CRM.prototype.createNote = function (id, title, content, callback){
  var mod = 'Notes';
  var xml = this._build(mod, {
    'entityId': id,
    'Note Title': title,
    'Note Content': content
  });
  this._request('GET', mod + '/insertRecords', { xmlData: xml }, callback);
};

/**
* Create a note for specific object
* Builds xml and sends insertRecords request for 'Notes'
* @param {String} id - Object identificator
* @param {String} title -  Title for note
* @param {String} content -  Note content
* @param {Function} callback -
*/
CRM.prototype.getNotes= function (id, callback){
  var mod = 'Notes';
  var params =  {
    searchColumn: 'notesid',
    searchValue: id
  };
  this._request('GET', mod + '/getSearchRecordsByPDC', params, callback);
};



/**
* Update Record
* Builds xml and sends updateRecords (POST) request
* @param {String} module - Zoho module
* @param {String} id - Object identificator
* @param {Object} params -  Data to send (expressed in JSON)
* @param {Function} callback -
*/
CRM.prototype.updateRecord = function (module, id, params, callback) {
  params = params || {};

  if (typeof params !== 'object' || Object.keys(params).length === 0) {
    return callback({ message: 'Error: params object required to update record' }, null);
  }

  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to update a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);
  var xml = this._build(module, params);

  this._request('POST', module + '/updateRecords', { id: id, xmlData: xml }, callback);
};

/**
* Delete Record
* Builds xml and sends deleteRecords request
* @param {String} module - Zoho module
* @param {String} id - Object identificator
* @param {Function} callback -
*/
CRM.prototype.deleteRecord = function (module, id, callback) {
  if (typeof id === 'object' || typeof id === 'undefined') {
    return callback({ message: 'Error: ID required parameter missing to delete a record' }, null);
  }

  module = module.charAt(0).toUpperCase() + module.slice(1);

  this._request('GET', module + '/deleteRecords', { id: id }, callback);
};


/* Private functions */

/**
* Build XML data
* Builds xml width data
* @private
* @param {String} module - Zoho module
* @param {Object} data -
*/
CRM.prototype._build = function (module, data) {
  var records = data instanceof Array ? data : [data];

  var xml = '<' + module + '>';

  var buildProductDetails = function (products) {
    var xml = '';
    products.forEach(function (product, index) {
      xml += '<product no="' + (index + 1) + '">';
      for (var prop in product) {
        xml += '<FL val="' + prop + '"><![CDATA[' + product[prop] + ']]></FL>';
      }
      xml += '</product>';
    })
    return xml;
  }

  records.forEach(function (params, index) {
    xml += '<row no="' + (index + 1) + '">';
    for (var param in params) {
      if(param === 'Product Details' && Array.isArray(params[param])){
        xml += '<FL val="' + param + '">' + buildProductDetails(params[param]) + '</FL>';
      }else{
        xml += '<FL val="' + param + '"><![CDATA[' + params[param] + ']]></FL>';
      }
    }
    xml += '</row>';
  });
  xml += '</' + module + '>';
  return xml;
};


/**
* Request
* Wraps and builds https request for Zoho API conventions
* @private
* @param {String} method - Http method type
* @param {String} endpoint - Endpoint path
* @param {Object} params - Data to send (expressed in JSON)
*/
CRM.prototype._request = function (method, endpoint, params, callback) {
  params = params || {};

  params.authtoken = this.authtoken;
  params.scope = this.scope;

  var options = {
    host: this.host,
    port: this.port,
    path: '/crm/private/json/' + endpoint + '?' + qs.stringify(params),
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

        if (data.response.error) {
          debug.crm.fail(data.response.error);
          return callback({
            code: data.response.error.code,
            message: data.response.error.message
          }, null);
        } else if (data.response.nodata) {
          debug.crm.fail(data.response.nodata);
          return callback({
            code: data.response.nodata.code,
            message: data.response.nodata.message
          }, null);
        } else {
          var object = {};

          object.code = data.response.result.code || 0;
          object.data = data.response.result.recorddetail;
          object.data = object.data || data.response.result;

          debug.crm.done(data.response.result);
          return callback(null, object);
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

module.exports = CRM;
