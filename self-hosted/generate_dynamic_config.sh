#!/bin/sh

# Remove 'https://' from WEBDOMAIN if present
WEBDOMAIN=${WEBDOMAIN#https://}

cat << EOF > /traefik-config/dynamic.yml
http:
  routers:
    frontend-service-router-80:
      rule: "Host(\`${WEBDOMAIN}\`)"
      service: frontend-service
      entrypoints: web

    frontend-service-router-443:
      entrypoints:
        - websecure
      rule: "Host(\`${WEBDOMAIN}\`)"
      service: frontend-service
      tls:
        certResolver: myresolver

    api-service-router-80:
      rule: "Host(\`${WEBDOMAIN}\`) && PathPrefix(\`/api\`)"
      service: api-service
      entrypoints: web
      middlewares:
        - strip-api-prefix

    api-service-router-443:
      entrypoints:
        - websecure
      rule: "Host(\`${WEBDOMAIN}\`) && PathPrefix(\`/api\`)"
      service: api-service
      middlewares:
        - strip-api-prefix
      tls:
        certResolver: myresolver

  middlewares:
    strip-api-prefix:
      stripPrefix:
        prefixes:
          - "/api"

  services:
    frontend-service:
      loadBalancer:
        servers:
          - url: "http://localhost:3000"
    api-service:
      loadBalancer:
        servers:
          - url: "http://localhost:4000"

EOF
