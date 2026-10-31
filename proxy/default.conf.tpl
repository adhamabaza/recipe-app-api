server {
    listen ${LISTEN_PORT};
    resolver 127.0.0.11 valid=10s ipv6=off;

    location /static {
        alias /vol/static;
    }

    location / {
        set $app_upstream ${APP_HOST}:${APP_PORT};
        uwsgi_pass            $app_upstream;
        include               /etc/nginx/uwsgi_params;
        client_max_body_size  10M;
    }
}
