<?php

namespace App\Support;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
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

        Log::warning('PDF email queued after response.', [
            'to' => $email['to'],
            'filename' => $filename,
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'scheme' => config('mail.mailers.smtp.scheme'),
        ]);

        defer(static function () use ($email, $subject, $body, $pdf, $filename): void {
            try {
                Log::warning('PDF email send started.', [
                    'to' => $email['to'],
                    'filename' => $filename,
                ]);

                Mail::raw($body, static function ($message) use ($email, $subject, $pdf, $filename): void {
                    $message
                        ->to($email['to'])
                        ->subject($subject)
                        ->attachData($pdf->output(), $filename, [
                            'mime' => 'application/pdf',
                        ]);
                });

                Log::warning('PDF email send completed.', [
                    'to' => $email['to'],
                    'filename' => $filename,
                ]);
            } catch (Throwable $exception) {
                Log::error('PDF email send failed.', [
                    'to' => $email['to'],
                    'filename' => $filename,
                    'error' => $exception->getMessage(),
                ]);

                report($exception);
            }
        });
    }
}
