<div align="center">
  <img align="center" src="../extension/public/icons/icon128.png" >
  <h1><a href="https://julius383.github.io/PageSieve/">PageSieve CLI</a></h1>
</div>

A secondary client (in addition to browser extension) for extracting data based on
the ScrapeConfig. Also contains additional commands such as one for validating
a file against the current ScrapeConfig Zod schema.

## Installation

The cli can be installed from npmjs or directly from the repo by running `just
install-cli` which builds and installs the app globally with bun.


```
npm install pagesieve-cli
```

In order to use the cli you need to install Chromium from Playwright

```
npx playwright install chromium
```


## Usage

Generated using the `dumpHelp` function in `src/commands.ts`

```
Command: run
   run [options] Extract using ScrapeConfig and save results
Options:
  -c, --config <config-file> Scrape recipe
  -o, --output-file [output] File or folder to save to without extension (default: "output")
  -f, --output-format [format] Which format to output for each result (default: "json")
  -m, --output-mode [mode] How to save files. Important when extracting different kinds of data (default: "zip")
  -e, --engine [engine] Which engine to use (default: "cheerio")
  -r, --max-requests [number] Maximum total number of requests (default: "500")
  -x, --proxy <proxy> URL for proxy to use
  --dry-run Test mode (default: false)
  -h, --help display help for command

Command: verify
   verify [options] Check if ScrapeConfig is valid and print any errors
Options:
  -c, --config <config-file>
  -h, --help display help for command

Command: migrate
   migrate [options] Migrate between ScrapeConfig versions
Options:
  -c, --config <config-file> config to check
  --version <version> version to migrate to (default: "latest")
  -h, --help display help for command

Command: serve
   serve [options] Start PageSieve Run service
Options:
  -p, --port <port> port number to start service (default: "4444")
  -x, --proxy <proxy> URL for proxy to use
  -h, --help display help for command

Command: help
   help [command] display help for command
```


### Extra Configuration

In development a custom proxy that serves versions of websites cached using
[SingleFile][1] through a [mitmproxy][2] addon modified from one of the [examples][3]
is used to avoid bombarding the original hosts with too much traffic. It also
avoids needing to modify the url property in scrape recipes removing the need
to maintain a separate version for testing

The easiest option is adding the `mitmproxy` certificate to the system store
and set `NODE_USE_SYSTEM_CA=1` in the cli environment.

Alternatively for the cheerio engine add the `mitmproxy` certificate (`NODE_EXTRA_CA_CERTS`) as an extra 
and set the hash of the proxy as an exception in chromium `PAGESIEVE_PROXY_SPKI`:

```bash
export NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem
export PAGESIEVE_PROXY_SPKI="$(openssl x509 -in ~/.mitmproxy/mitmproxy-ca-cert.pem -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64)"
```


[1]: https://github.com/gildas-lormeau/SingleFile
[2]: https://docs.mitmproxy.org/
[3]: https://docs.mitmproxy.org/stable/addons/examples/#internet-in-mirror
