# Local IAM client, built from the final official minio/mc source commit.
# linux/amd64 only; both base references are architecture-specific manifests.
# Source: https://github.com/minio/mc/commit/77f82e18b5401a65958f1619df6ebb994634bd88
FROM docker.io/library/golang:1.24.9-bookworm@sha256:ff6adf7c7ec50bebe6d3f4f4c679c9edb47e1113664eaa98172a48e8185b8a30 AS build
ENV MC_COMMIT=77f82e18b5401a65958f1619df6ebb994634bd88
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOOS=linux GOARCH=amd64
WORKDIR /src
RUN git init . && git remote add origin https://github.com/minio/mc.git \
    && git fetch --depth 1 origin "${MC_COMMIT}" \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "${MC_COMMIT}" \
    && test "$(go mod edit -json | sed -n 's/.*"Toolchain": "\([^"]*\)".*/\1/p')" = go1.24.9 \
    && test "$(go version | sed -n 's/^go version \(go[^ ]*\) .*/\1/p')" = go1.24.9
RUN go mod download && go build -mod=readonly -trimpath -buildvcs=false -tags kqueue \
    -ldflags "$(MC_RELEASE=DEVELOPMENT go run buildscripts/gen-ldflags.go)" -o /out/mc .

FROM docker.io/library/debian:bookworm-slim@sha256:f3034a6ec3c1205360777c4aae76234998866ad18806ae62b63a3f84ccad782b AS client
COPY --from=build /out/mc /usr/local/bin/mc
COPY --from=build /src/LICENSE /licenses/LICENSE
COPY --from=build /src/CREDITS /licenses/CREDITS
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/mc"]
LABEL org.opencontainers.image.source="https://github.com/minio/mc" \
      org.opencontainers.image.revision="77f82e18b5401a65958f1619df6ebb994634bd88" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

FROM node:24-bookworm-slim AS bootstrap
COPY --from=client /usr/local/bin/mc /usr/local/bin/mc
COPY --from=client /licenses /licenses
COPY app-policy.json /bootstrap/app-policy.json
COPY coolify-init.mjs /bootstrap/init.mjs
USER 10001:10001
ENTRYPOINT ["node", "/bootstrap/init.mjs"]

# Preserve the original default image for existing local mc workflows.
FROM client AS default-client
