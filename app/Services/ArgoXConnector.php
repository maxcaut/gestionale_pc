<?php

namespace App\Services;

use RuntimeException;

class ArgoXConnector
{
    public function radioList(): array
    {
        $host = (string) config('services.argo_x.host');
        $port = (int) config('services.argo_x.port');
        $readKey = (string) config('services.argo_x.read_key');

        if ($host === '' || $port < 1 || $port > 65535 || $readKey === '') {
            throw new RuntimeException('Configurazione connettore ARGO-X incompleta.');
        }

        $errorCode = 0;
        $errorMessage = '';
        $socket = @stream_socket_client(
            sprintf('tcp://%s:%d', $host, $port),
            $errorCode,
            $errorMessage,
            8,
            STREAM_CLIENT_CONNECT,
        );

        if (! is_resource($socket)) {
            throw new RuntimeException('Connettore ARGO-X non raggiungibile ('.$errorCode.').');
        }

        try {
            stream_set_timeout($socket, 12);
            $welcome = $this->readJsonLine($socket);
            if (($welcome['tipo'] ?? null) !== 'benvenuto'
                || ($welcome['dati']['servizio'] ?? null) !== 'ARGO-X') {
                throw new RuntimeException('Banner connettore ARGO-X non valido.');
            }

            $this->writeLine($socket, $readKey);
            $requestId = 'elenco-'.bin2hex(random_bytes(8));
            $this->writeLine($socket, json_encode([
                'id' => $requestId,
                'comando' => 'elenco_radio',
            ], JSON_THROW_ON_ERROR));

            while (! feof($socket)) {
                $message = $this->readJsonLine($socket);

                if (($message['tipo'] ?? null) === 'errore') {
                    throw new RuntimeException('Autenticazione connettore ARGO-X rifiutata.');
                }

                if (($message['id'] ?? null) !== $requestId) {
                    continue;
                }

                if (! in_array($message['tipo'] ?? null, ['risposta', 'risposta_comando'], true)
                    || ($message['ok'] ?? $message['dati']['ok'] ?? false) !== true) {
                    throw new RuntimeException('Richiesta elenco radio ARGO-X non riuscita.');
                }

                $radios = $message['radio'] ?? $message['dati']['radio'] ?? [];
                if (! is_array($radios)) {
                    throw new RuntimeException('Elenco radio ARGO-X non valido.');
                }

                return $radios;
            }

            throw new RuntimeException('Il connettore ARGO-X ha chiuso il collegamento.');
        } finally {
            fclose($socket);
        }
    }

    public function listen(callable $onMessage): void
    {
        $socket = $this->connect();

        try {
            $this->authenticate($socket);
            // Il protocollo non invia un ACK: lasciamo completare la verifica
            // della chiave prima del primo comando sulla stessa connessione.
            usleep(250_000);
            $requestId = 'iniziale-'.bin2hex(random_bytes(8));
            $this->writeLine($socket, json_encode([
                'id' => $requestId,
                'comando' => 'elenco_radio',
            ], JSON_THROW_ON_ERROR));

            while (! feof($socket)) {
                $onMessage($this->readJsonLine($socket));
            }

            throw new RuntimeException('Il connettore ARGO-X ha chiuso il collegamento.');
        } finally {
            fclose($socket);
        }
    }

    private function connect()
    {
        $host = (string) config('services.argo_x.host');
        $port = (int) config('services.argo_x.port');
        $readKey = (string) config('services.argo_x.read_key');

        if ($host === '' || $port < 1 || $port > 65535 || $readKey === '') {
            throw new RuntimeException('Configurazione connettore ARGO-X incompleta.');
        }

        $errorCode = 0;
        $errorMessage = '';
        $socket = @stream_socket_client(
            sprintf('tcp://%s:%d', $host, $port),
            $errorCode,
            $errorMessage,
            8,
            STREAM_CLIENT_CONNECT,
        );

        if (! is_resource($socket)) {
            throw new RuntimeException('Connettore ARGO-X non raggiungibile ('.$errorCode.').');
        }

        stream_set_timeout($socket, 90);

        return $socket;
    }

    private function authenticate($socket): void
    {
        $welcome = $this->readJsonLine($socket);
        if (($welcome['tipo'] ?? null) !== 'benvenuto'
            || ($welcome['dati']['servizio'] ?? null) !== 'ARGO-X') {
            throw new RuntimeException('Banner connettore ARGO-X non valido.');
        }

        $this->writeLine($socket, (string) config('services.argo_x.read_key'));
    }

    private function readJsonLine($socket): array
    {
        $line = fgets($socket, 1024 * 1024);
        $metadata = stream_get_meta_data($socket);

        if ($line === false) {
            throw new RuntimeException(($metadata['timed_out'] ?? false)
                ? 'Timeout dal connettore ARGO-X.'
                : 'Connessione ARGO-X interrotta.');
        }

        $message = json_decode(trim($line), true);
        if (! is_array($message)) {
            throw new RuntimeException('Riga JSON ARGO-X non valida.');
        }

        return $message;
    }

    private function writeLine($socket, string $line): void
    {
        $payload = $line."\n";
        $written = fwrite($socket, $payload);

        if ($written === false || $written !== strlen($payload)) {
            throw new RuntimeException('Invio al connettore ARGO-X non riuscito.');
        }
    }
}
