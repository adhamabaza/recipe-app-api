server {
    listen ${LISTEN_PORT};
    resolver 127.0.0.11 valid=10s ipv6=off;

    location /static {
        alias /vol/static;
    }

    location ~ ^/(api|admin)(/|$) {
        set $app_upstream ${APP_HOST}:${APP_PORT};
        uwsgi_pass            $app_upstream;
        include               /etc/nginx/uwsgi_params;
        client_max_body_size  10M;
    }

    location / {
        set $frontend_upstream frontend:8080;
        proxy_pass http://$frontend_upstream;
        proxy_set_header Host $host;
    }
}
