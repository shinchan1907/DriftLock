FROM nginx:1.25-alpine

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Install bash for the entrypoint wrapper
RUN apk add --no-cache bash

# Copy main nginx.conf
COPY nginx.conf /etc/nginx/nginx.conf

# Copy templates — the official nginx image runs envsubst on
# /etc/nginx/templates/*.template and outputs to /etc/nginx/conf.d/
COPY conf.d/ /etc/nginx/templates/

# Custom entrypoint wrapper that conditionally enables SSL
COPY docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /docker-entrypoint-wrapper.sh

# Create certbot webroot directory
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

# Use our wrapper, which calls the original entrypoint
ENTRYPOINT ["/docker-entrypoint-wrapper.sh"]
CMD ["nginx", "-g", "daemon off;"]
