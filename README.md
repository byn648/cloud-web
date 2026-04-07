# cloud-web

`cloud-web` is a minimal frontend scaffold aligned with kube-nova-web module paths.

## Layout

```text
cloud-web/src
├── api/
│   └── portal/
│       ├── auth.ts          # login API
│       ├── dashboard.ts     # dashboard API
│       └── index.ts         # portal API exports
├── types/
│   ├── auth.ts              # auth DTO types
│   └── dashboard.ts         # dashboard DTO types
├── utils/
│   └── encoding.ts          # kube-nova-compatible password encoding
└── views/
    ├── auth/
    │   └── login/
    │       ├── index.vue    # login page
    │       └── style.css    # login styles
    └── dashboard/
        └── ecommerce/
            ├── index.vue    # post-login main dashboard
            ├── style.css    # dashboard styles
            └── modules/
            ├── banner.vue
            ├── annual-sales.vue
            ├── cart-conversion-rate.vue
            ├── hot-commodity.vue
            ├── total-products.vue
            ├── total-order-volume.vue
            ├── hot-products-list.vue
            ├── product-sales.vue
            ├── recent-transaction.vue
            ├── sales-classification.vue
            ├── sales-growth.vue
            ├── sales-trend.vue
            └── transaction-list.vue
```

## Run

```bash
cd cloud-web
npm install
npm run dev
```

Dev proxy:

- `/portal` -> `http://127.0.0.1:8810`
