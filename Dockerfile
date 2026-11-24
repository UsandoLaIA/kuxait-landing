# Static site — nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html terms.html refund-policy.html privacy-policy.html robots.txt sitemap.xml llms.txt /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
