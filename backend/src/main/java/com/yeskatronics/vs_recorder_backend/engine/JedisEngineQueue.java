package com.yeskatronics.vs_recorder_backend.engine;

import org.apache.commons.pool2.impl.GenericObjectPoolConfig;
import redis.clients.jedis.Connection;
import redis.clients.jedis.JedisPooled;

import java.net.URI;
import java.util.Map;
import java.util.Optional;

/**
 * {@link EngineQueue} over Jedis. A {@code rediss://} URL connects with TLS, and the
 * URL's password authenticates. The pool is small: the poller and the occasional
 * submit or cancel are its only users.
 */
public class JedisEngineQueue implements EngineQueue, AutoCloseable {

    private static final int TIMEOUT_MS = 5_000;

    private final JedisPooled jedis;
    private final String prefix;

    public JedisEngineQueue(String redisUrl, String prefix) {
        GenericObjectPoolConfig<Connection> pool = new GenericObjectPoolConfig<>();
        pool.setMaxTotal(4);
        pool.setMaxIdle(2);
        pool.setMinIdle(0);
        this.jedis = new JedisPooled(pool, URI.create(redisUrl), TIMEOUT_MS);
        this.prefix = prefix;
    }

    @Override
    public void submit(String jobJson) {
        jedis.lpush(prefix + ":jobs", jobJson);
    }

    @Override
    public Map<String, String> jobState(String jobId) {
        return jedis.hgetAll(prefix + ":job:" + jobId);
    }

    @Override
    public Optional<String> partial(String jobId) {
        return Optional.ofNullable(jedis.get(prefix + ":partial:" + jobId));
    }

    @Override
    public Optional<String> result(String jobId) {
        return Optional.ofNullable(jedis.get(prefix + ":result:" + jobId));
    }

    @Override
    public void cancel(String jobId) {
        jedis.set(prefix + ":cancel:" + jobId, "1");
    }

    @Override
    public void cleanup(String jobId) {
        jedis.del(
                prefix + ":result:" + jobId,
                prefix + ":partial:" + jobId,
                prefix + ":job:" + jobId,
                prefix + ":cancel:" + jobId);
    }

    @Override
    public void close() {
        jedis.close();
    }
}
