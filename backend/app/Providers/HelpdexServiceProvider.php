<?php

namespace App\Providers;

use App\Application\AI\SuggestionsServiceInterface;
use App\Application\Tickets\TicketRepositoryInterface;
use App\Infrastructure\AI\OpenAISuggestionsService;
use App\Infrastructure\AutoTask\AutoTaskApiClient;
use App\Infrastructure\AutoTask\AutoTaskTicketRepository;
use App\Infrastructure\DattoRmm\DattoRmmApiClient;
use Illuminate\Support\ServiceProvider;

class HelpdexServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AutoTaskApiClient::class, function () {
            return new AutoTaskApiClient(
                config('autotask.zone_url'),
                config('autotask.username'),
                config('autotask.secret'),
                config('autotask.integration_code')
            );
        });

        $this->app->bind(TicketRepositoryInterface::class, function () {
            return new AutoTaskTicketRepository(
                $this->app->make(AutoTaskApiClient::class),
                config('autotask.cache_ttl', 60)
            );
        });

        $this->app->bind(SuggestionsServiceInterface::class, function () {
            return new OpenAISuggestionsService(
                config('ai.api_key', ''),
                config('ai.model', 'gpt-4o-mini'),
                config('ai.base_url', 'https://api.openai.com/v1'),
                config('ai.verify_ssl', true)
            );
        });

        $this->app->singleton(DattoRmmApiClient::class, function () {
            return new DattoRmmApiClient(
                config('datto_rmm.api_url', ''),
                config('datto_rmm.api_key', ''),
                config('datto_rmm.api_secret', ''),
                config('datto_rmm.client_id', 'public-client'),
                config('datto_rmm.client_secret', 'public'),
                filter_var(env('DATTO_RMM_VERIFY_SSL', true), FILTER_VALIDATE_BOOLEAN)
            );
        });
    }

    public function boot(): void
    {
        //
    }
}
