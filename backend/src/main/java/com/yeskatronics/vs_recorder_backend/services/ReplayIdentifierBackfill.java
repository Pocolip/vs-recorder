package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** One-time, restartable backfill. Never scans historical logs on the import path. */
@Component
@RequiredArgsConstructor
public class ReplayIdentifierBackfill implements ApplicationRunner {
    private final ReplayMetadataService metadata;
    private final ReplayRepository replays;
    private final PlatformTransactionManager transactions;

    @Override
    public void run(ApplicationArguments args) {
        TransactionTemplate transaction = new TransactionTemplate(transactions);
        while (Boolean.TRUE.equals(transaction.execute(status -> {
            var batch = replays.findWithoutMetadata(PageRequest.of(0, 100));
            batch.forEach(metadata::index);
            replays.flush();
            return !batch.isEmpty();
        }))) {
            // Each batch commits independently, allowing safe restart after interruption.
        }
    }
}
