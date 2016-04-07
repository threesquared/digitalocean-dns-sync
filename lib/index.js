'use strict';

var _dnsZonefile = require('dns-zonefile');

var _dnsZonefile2 = _interopRequireDefault(_dnsZonefile);

var _doWrapper = require('do-wrapper');

var _doWrapper2 = _interopRequireDefault(_doWrapper);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _glob = require('glob');

var _glob2 = _interopRequireDefault(_glob);

var _limiter = require('limiter');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var args = process.argv.slice(2);

if (args.length !== 3) {
    console.log('Usage is ./digitalocean-dns-sync <api-token> <ip> <pattern>');
    process.exit(0);
}

var apiKey = args[0];
var ipAddress = args[1];
var pattern = args[2];

var api = new _doWrapper2.default(apiKey, 10);
var limiter = new _limiter.RateLimiter(1, 500);

(0, _glob2.default)(pattern, function (error, files) {

    files.forEach(function (filename) {

        var text = _fs2.default.readFileSync(filename, 'utf8');
        var zone = _dnsZonefile2.default.parse(text);
        var domain = zone.$origin.slice(0, -1);

        console.log('Refreshing domain ' + domain);

        api.domainsDelete(domain, function () {

            api.domainsCreate(domain, ipAddress, function () {

                api.domainRecordsGetAll(domain, { includeAll: true }, function (error, response, body) {

                    // Delete default records
                    body.forEach(function (record) {
                        apiCall('domainRecordsDelete', domain, record.id);
                    });

                    if (zone.hasOwnProperty('ns')) {
                        zone.ns.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'NS', name: item.name, data: item.host });
                        });
                    }

                    if (zone.hasOwnProperty('mx')) {
                        zone.mx.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'MX', name: item.name, data: item.host, priority: item.preference });
                        });
                    }

                    if (zone.hasOwnProperty('cname')) {
                        zone.cname.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'CNAME', name: item.name, data: item.alias });
                        });
                    }

                    if (zone.hasOwnProperty('a')) {
                        zone.a.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'A', name: item.name, data: item.ip });
                        });
                    }

                    if (zone.hasOwnProperty('aaaa')) {
                        zone.aaaa.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'AAAA', name: item.name, data: item.ip });
                        });
                    }

                    if (zone.hasOwnProperty('txt')) {
                        zone.txt.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'TXT', name: item.name, data: item.txt });
                        });
                    }

                    if (zone.hasOwnProperty('srv')) {
                        zone.srv.forEach(function (item) {
                            apiCall('domainRecordsCreate', domain, { type: 'SRV', name: item.name, data: item.target, priority: item.priority, weight: item.weight, port: item.port });
                        });
                    }
                });
            });
        });
    });
});

function apiCall(name, domain, data) {
    limiter.removeTokens(1, function () {
        api[name](domain, data, function (error, response, body) {
            if (body && body.hasOwnProperty('id')) {
                console.log('Error: ' + body.message + ' - ' + domain + ' ' + JSON.stringify(data));
            }
        });
    });
}