FROM nginx:1.25-alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Install bash for potential scripts
RUN apk add --no-cache bash

# nginx official image automatically runs envsubst on files in /etc/nginx/templates/
# and outputs them to /etc/nginx/conf.d/
COPY conf.d/ /etc/nginx/templates/

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
