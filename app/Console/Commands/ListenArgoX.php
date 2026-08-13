<?php

namespace App\Console\Commands;

use App\Services\ArgoXConnector;
use App\Services\ArgoXRadioState;
use Illuminate\Console\Command;
use Throwable;

class ListenArgoX extends Command
{
    protected $signature = 'argo:listen';

    protected $description = 'Mantiene il collegamento di sola lettura al connettore ARGO-X';

    public function handle(ArgoXConnector $connector, ArgoXRadioState $state): int
    {
        while (true) {
            try {
                $this->info('Connessione al connettore ARGO-X...');
                $state->markConnected(true);
                $connector->listen(fn (array $message) => $state->handle($message));
            } catch (Throwable $exception) {
                report($exception);
                $state->markConnected(false);
                $this->warn('Connessione ARGO-X interrotta; nuovo tentativo tra 5 secondi.');
                sleep(5);
            }
        }
    }
}
