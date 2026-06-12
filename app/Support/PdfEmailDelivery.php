<?php

namespace App\Support;

use Illuminate\Support\Facades\Mail;
use Throwable;

class PdfEmailDelivery
{
    /**
     * @param  array{to: string, subject?: string|null, body?: string|null}  $email
     */
    public static function send(mixed $pdf, string $filename, array $email): void
    {
        $subject = trim((string) ($email['subject'] ?? ''));
        $body = trim((string) ($email['body'] ?? ''));

        if ($subject === '') {
            $subject = $filename;
        }

        if ($body === '') {
            $body = 'in allegato il file '.$filename;
        }

        defer(static function () use ($email, $subject, $body, $pdf, $filename): void {
            try {
                Mail::raw($body, static function ($message) use ($email, $subject, $pdf, $filename): void {
                    $message
                        ->to($email['to'])
                        ->subject($subject)
                        ->attachData($pdf->output(), $filename, [
                            'mime' => 'application/pdf',
                        ]);
                });
            } catch (Throwable $exception) {
                report($exception);
            }
        });
    }
}
