// fix-form.js
// Usage: node fix-form.js form.html

const fs = require("fs");

const file = process.argv[2] || "form.html";
let html = fs.readFileSync(file, "utf8");

// 1) Remove Webflow CSS link line (if present)
html = html.replace(
  /<link[^>]*cdn\.prod\.website-files\.com[^>]*subswap\.webflow\.shared[^>]*>\s*/gi,
  ""
);

// 2) Ensure meta charset + viewport exist after <head>
if (!/<meta\s+charset=/i.test(html)) {
  html = html.replace(/<head>\s*/i, `<head>\n  <meta charset="UTF-8" />\n`);
}
if (!/<meta\s+name=["']viewport["']/i.test(html)) {
  html = html.replace(
    /<meta\s+charset=["'][^"']+["']\s*\/?>\s*/i,
    (m) => `${m}  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n`
  );
}

// 3) Replace title with Post a Listing
if (/<title>.*<\/title>/i.test(html)) {
  html = html.replace(/<title>.*<\/title>/i, `<title>SubletBuff | Post a Listing</title>`);
} else {
  html = html.replace(/<head>\s*/i, `<head>\n  <title>SubletBuff | Post a Listing</title>\n`);
}

// 4) Ensure /site.css is linked (only once)
if (!/href=["']\/site\.css["']/i.test(html)) {
  // Insert after google fonts stylesheet if possible
  if (/fonts\.googleapis\.com\/css2\?/i.test(html)) {
    html = html.replace(
      /(<link[^>]*fonts\.googleapis\.com[^>]*>\s*)/i,
      `$1\n<link rel="stylesheet" href="/site.css" />\n`
    );
  } else {
    html = html.replace(/<\/head>/i, `  <link rel="stylesheet" href="/site.css" />\n</head>`);
  }
} else {
  // If multiple, keep first and remove the rest
  const matches = html.match(/<link[^>]*href=["']\/site\.css["'][^>]*>\s*/gi) || [];
  if (matches.length > 1) {
    let firstKept = false;
    html = html.replace(/<link[^>]*href=["']\/site\.css["'][^>]*>\s*/gi, (m) => {
      if (!firstKept) { firstKept = true; return m; }
      return "";
    });
  }
}

// 5) Fix nav links: /form-submission -> /form.html
html = html.replace(/href=["']\/form-submission["']/gi, `href="/form.html"`);

// 6) Fix Home links that are href="#" inside nav menus -> "/"
html = html.replace(/(<nav[\s\S]*?<\/nav>)/i, (navBlock) => {
  // Replace only anchors that literally have href="#"
  return navBlock.replace(/href=["']#["']/gi, `href="/"`);
});

// 7) Replace old jsDelivr form-logic.js with local /form-logic.js
html = html.replace(
  /<script[^>]*cdn\.jsdelivr\.net\/gh\/ethanivler-dev\/subswap-scripts@[^"']*\/form-logic\.js["'][^>]*>\s*<\/script>/gi,
  `<script src="/form-logic.js"></script>`
);

// 8) Ensure Supabase script exists before form-logic (only once)
if (!/supabase-js@2/i.test(html)) {
  html = html.replace(
    /<\/body>/i,
    `  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</body>`
  );
}

fs.writeFileSync(file, html, "utf8");
console.log(`✅ Updated ${file}`);
