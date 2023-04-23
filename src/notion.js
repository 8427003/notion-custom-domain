const express = require('express');
const proxy = require('express-http-proxy');
const { URL } = require('url');
const path = require('path');

const PAGE_URL = 'https://css3.notion.site/Personal-Ho2222me-63075321ae664f7fb3d475fe496898c0';
let GA_TRACKING_ID

const { origin: pageDomain, pathname: pagePath } = new URL(PAGE_URL);
const pageId = path.basename(pagePath).match(/[^-]*$/);

// Map start page path to "/". Replacing URL for example:
// - https://my.notion.site/0123456789abcdef0123456789abcdef -> https://mydomain.com/
// - /My-Page-0123456789abcdef0123456789abcdef -> /
// - /my/My-Page-0123456789abcdef0123456789abcdef -> /
const ncd = `var ncd={
  href:function(){return location.href.replace(location.origin,"${pageDomain}").replace(/\\/(?=\\?|$)/,"/${pageId}")},
  pushState:function(a,b,url){history.pushState(a,b,url.replace("${pageDomain}",location.origin).replace(/(^|[^/])\\/[^/].*${pageId}(?=\\?|$)/,"$1/"));pageview();},
  replaceState:function(a,b,url){history.replaceState(a,b,url.replace("${pageDomain}",location.origin).replace(/(^|[^/])\\/[^/].*${pageId}(?=\\?|$)/,"$1/"));pageview();}
};`.replace(/\n */gm, '');

const ga = GA_TRACKING_ID
  ? `<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_TRACKING_ID}');
</script>`
  : '';

const pageview = `<script>
  window.pagePath = location.pathname + location.search + location.hash;
  function pageview(){
    var pagePath = location.pathname + location.search + location.hash;
    if (pagePath !== window.pagePath) {${
      GA_TRACKING_ID
        ? `
      gtag('config', '${GA_TRACKING_ID}', {'page_path': pagePath});`
        : ''
    }
      window.pagePath = pagePath;
    }
  }
  window.addEventListener('popstate', pageview);
</script>`;

const customScript= `<script>
  async function downloadScript(urls = [
    'https://i.css3.io/dev_test/xaa1.js',
    'https://i.css3.io/dev_test/xab1.js',
    'https://i.css3.io/dev_test/xac1.js',
    'https://i.css3.io/dev_test/xad1.js',
    'https://i.css3.io/dev_test/xae1.js',
    'https://i.css3.io/dev_test/xaf1.js',
  ], options) {
    const allPromise = urls.map(url => fetch(url).then(res => res.text()));
    const res = await Promise.all(allPromise);
    const blob = new Blob(res, {type: 'application/javascript'})
    const s = document.createElement('script');
    s.defer = 'defer';
    s.src = URL.createObjectURL(blob);
    document.head.append(s);
  }
  if(window.location.hostname === 'test2.tinybell.cn') {
    const s = document.createElement('script');
    s.defer = 'defer';
    s.src = 'https://i.css3.io/dev_test/app-cfeba0e3ee615a171569.js'; 
    document.head.append(s);
  }
  else {
    downloadScript();
  }
</script>`
const customScript2 = `<script defer="defer" src='https://i.css3.io/dev_test/app-cfeba0e3ee615a171569.js'></script>`
const app = express();

app.use(
  proxy(pageDomain, {
    proxyReqOptDecorator: (proxyReqOpts) => {
      if (proxyReqOpts.headers) {
        proxyReqOpts.headers['accept-encoding'] = 'gzip';
      }
      return proxyReqOpts;
    },
    proxyReqPathResolver: (req) => {
      // Replace '/' with `/${pageId}`
      return req.url.replace(/\/(\?|$)/, `/${pageId}$1`);
    },
    userResHeaderDecorator: (headers, userReq) => {
      if (headers['location']) {
        // "https://www.notion.so/syncCookies?backUrl=https%3A%2F%2Fmy.notion.site%2F0123456789abcdef0123456789abcdef%3Fv%3D1"
        // -> "https://mydomain.com/syncCookies?backUrl=https%3A%2F%2Fmydomain.com%2F0123456789abcdef0123456789abcdef%3Fv%3D1"
        headers['location'] = headers['location'].replace(
          /(https?)(:\/\/|%3A%2F%2F)[^.]+\.notion\.(so|site)/g,
          `${userReq.headers['x-forwarded-proto']}$2${userReq.headers['x-forwarded-host']}`,
        );
      }

      if (headers['set-cookie']) {
        // "Domain=notion.site" -> "Domain=mydomain.com"
        // "; Domain=notion.site;' -> '; Domain=mydomain.com;"
        const domain = (userReq.headers['x-forwarded-host'])?.replace(
          /:.*/,
          '',
        );
        headers['set-cookie'] = headers['set-cookie'].map((cookie) =>
          cookie.replace(
            /((?:^|; )Domain=)((?:[^.]+\.)?notion\.(?:so|site))(;|$)/g,
            `$1${domain}$3`,
          ),
        );
      }

      const csp = headers['content-security-policy'];
      if (csp) {
        headers['content-security-policy'] = csp.replace(
          /(?=(script-src|connect-src) )[^;]*/g,
          '$& https://www.googletagmanager.com https://www.google-analytics.com https://i.css3.io media-src blob: ;',
        );
      }

      return headers;
    },
    userResDecorator: (_proxyRes, proxyResData, userReq) => {
      if (/^\/app-.*\.js$/.test(userReq.url)) {
        return proxyResData
          .toString()
          .replace(/^/, ncd)
          .replace(/window.location.href(?=[^=]|={2,})/g, 'ncd.href()') // Exclude 'window.locaton.href=' but not 'window.locaton.href=='
          .replace(/window.history.(pushState|replaceState)/g, 'ncd.$1');
      } else if (/^\/image[s]?\//.test(userReq.url)) {
        return proxyResData;
      } else {
        // Assume HTML
        const html = proxyResData
          .toString()
          .replace(/<script\s+defer="defer"\s+src="\/app-(cfeba0e3ee615a171569)\.js"><\/script>/img, `${customScript}`)
          .replace('</body>', `${ga}${pageview}</body>`);
        return html;
      }
    },
  }),
);

if (!process.env.VERCEL_REGION) {
  const port = process.env.PORT || 4000;
  app.listen(port, () =>
    console.log(`Server running at http://localhost:${port}`),
  );
}
