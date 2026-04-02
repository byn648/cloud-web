# cloud-web

`cloud-web` is a minimal frontend scaffold aligned with kube-nova-web module paths.

## Layout

```text
cloud-web/src
├── api/
│   └── portal/
│       └── auth.ts          # login API
├── types/
│   └── auth.ts              # auth DTO types
├── utils/
│   └── encoding.ts          # kube-nova-compatible password encoding
└── views/
    └── auth/
        └── login/
            ├── index.vue    # login page
            └── style.css    # page styles
```

## Run

```bash
cd cloud-web
npm install
npm run dev
```

Dev proxy:

- `/portal` -> `http://127.0.0.1:8810`
