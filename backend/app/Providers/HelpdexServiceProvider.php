<?php

namespace App\Providers;

use App\Application\AI\SuggestionsServiceInterface;
use App\Application\Tickets\TicketRepositoryInterface;
use App\Infrastructure\AI\OpenAISuggestionsService;
use App\Infrastructure\AutoTask\AutoTaskApiClient;
use App\Infrastructure\AutoTask\AutoTaskTicketRepository;
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
                config('ai.base_url', 'https://api.openai.com/v1')
            );
        });
    }

    public function boot(): void
    {
        //
    }
}
