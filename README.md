# digitalocean-dns-sync
DigitalOcean provide an awesome DNS service. But do not allow AXFR zone transfers. So if you want to use it as a secondary DNS server you need to create the zones manually. This script will parse BIND zone files and then re-create the records with the DigitalOcean API.

Requests to the API are limited to one every 500ms to avoid hammering.

### Usage

You need to supply your [API token](https://cloud.digitalocean.com/settings/api/tokens), the IP address of your server and then a [glob pattern](https://github.com/isaacs/node-glob#glob-primer) to match for files.

`./digitalocean-dns-sync <API-TOKEN> 178.0.0.1 *.zone`

### Credit

This is just a Javascript rewrite of https://github.com/HiddenClever/digitalocean-dns-sync
