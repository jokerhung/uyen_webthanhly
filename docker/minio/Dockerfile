# Build the community server directly from an immutable MinIO source commit.
# linux/amd64 only: the image digests below are platform-specific manifests.
# Source: https://github.com/minio/minio/commit/9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
FROM docker.io/library/golang:1.24.8-bookworm@sha256:39e2f344b68e61144a5de3d3bd166ea746ee8e1965e6fc2ad046df5cd6c8369e AS build
ENV MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a
ENV GOTOOLCHAIN=local CGO_ENABLED=0 GOOS=linux GOARCH=amd64
WORKDIR /src
RUN git init . && git remote add origin https://github.com/minio/minio.git \
    && git fetch --depth 1 origin "${MINIO_COMMIT}" \
    && git checkout --detach FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "${MINIO_COMMIT}" \
    && test "$(go mod edit -json | sed -n 's/.*"Toolchain": "\([^"]*\)".*/\1/p')" = go1.24.8
RUN go mod download && go build -mod=readonly -trimpath -buildvcs=false \
    -ldflags '-X github.com/minio/minio/cmd.Version=2025-10-15T17:29:55Z -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2025-10-15T17-29-55Z -X github.com/minio/minio/cmd.CommitID=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a -X github.com/minio/minio/cmd.ShortCommitID=9e49d5e7a648 -X github.com/minio/minio/cmd.CopyrightYear=2025' \
    -o /out/minio .
COPY healthcheck.go /tmp/minio-healthcheck.go
RUN cd /tmp && GO111MODULE=off go build -trimpath -o /out/minio-healthcheck minio-healthcheck.go

FROM docker.io/library/debian:bookworm-slim@sha256:f3034a6ec3c1205360777c4aae76234998866ad18806ae62b63a3f84ccad782b
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /out/minio-healthcheck /usr/local/bin/minio-healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=12 CMD ["/usr/local/bin/minio-healthcheck"]
RUN mkdir -p /data && chown 10001:10001 /data
USER 10001:10001
VOLUME ["/data"]
EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
