FROM ghcr.io/matter-js/matterjs-server:1.5.2@sha256:47bc4d8354baf4775c1daf87b02b61123b1b61feeb3b2eadb17c610dbbda9a1c
USER 0:0
COPY server /opt/fp400/server
COPY integration /opt/fp400/integration
ENV STORAGE_PATH=/data/matter
ENV PORT=5581
ENV LISTEN_ADDRESS=127.0.0.1
ENV VENDOR_ID=65521
ENV FABRIC_ID=400
ENV DISABLE_OTA=true
ENV DISABLE_THREAD_DIAGNOSTICS=true
ENV DISABLE_DASHBOARD=true
ENV MATTER_LOG_FORMAT=plain
ENV LOG_LEVEL=warning
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --start-interval=5s --retries=3 CMD ["node", "/opt/fp400/server/health.mjs"]
ENTRYPOINT ["node", "/opt/fp400/server/launch.mjs"]
CMD []
