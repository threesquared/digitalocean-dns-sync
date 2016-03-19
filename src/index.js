import zonefile from 'dns-zonefile';
import DigitalOcean from 'do-wrapper';
import fs from 'fs';
import glob from 'glob';
import { RateLimiter } from 'limiter';

const args = process.argv.slice(2);

if (args.length !== 3) {
    console.log('Usage is ./digitalocean-dns-sync <api-token> <ip> <pattern>');
    process.exit(0);
}

const apiKey = args[0];
const ipAddress = args[1];
const pattern = args[2];

let api = new DigitalOcean(apiKey, 10);
let limiter = new RateLimiter(1, 500);

glob(pattern, (error, files) => {

    files.forEach((filename) => {

        let text = fs.readFileSync(filename, 'utf8');
        let zone = zonefile.parse(text);
        let domain = zone.$origin.slice(0, -1);

        console.log('Refreshing domain ' + domain);

        api.domainsDelete(domain, () => {

            api.domainsCreate(domain, ipAddress, () => {

                api.domainRecordsGetAll(domain, { includeAll: true }, (error, response, body) => {

                    // Delete default records
                    body.domain_records.forEach((record) => {
                        apiCall('domainRecordsDelete', domain, record.id);
                    });

                    zone.ns.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'NS', name: item.name, data: item.host });
                    });

                    zone.mx.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'MX', name: item.name, data: item.host, priority: item.preference });
                    });

                    zone.cname.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'CNAME', name: item.name, data: item.alias });
                    });

                    zone.a.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'A', name: item.name, data: item.ip });
                    });

                    zone.aaaa.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'AAAA', name: item.name, data: item.ip });
                    });

                    zone.txt.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'TXT', name: item.name, data: item.txt });
                    });

                    zone.srv.forEach((item) => {
                        apiCall('domainRecordsCreate', domain, { type: 'SRV', name: item.name, data: item.target, priority: item.priority, weight: item.weight, port: item.port });
                    });

                });
            });
        });
    });
});

function apiCall(name, domain, data) {
    limiter.removeTokens(1, () => {
        api[name](domain, data, (error, response, body) => {
            if (body && body.hasOwnProperty('id')) {
                console.log('Error: ' + body.message + ' - ' + domain + ' ' + JSON.stringify(data));
            }
        });
    });
}
