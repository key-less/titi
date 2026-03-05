<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Enlace ticket (AutoTask) ↔ resource asignado.
     * Permite filtrar "mis tickets" por resource sin depender solo de la API en cada request.
     */
    public function up(): void
    {
        Schema::create('ticket_assignments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ticket_id')->comment('ID del ticket en AutoTask');
            $table->unsignedBigInteger('assigned_resource_autotask_id')->comment('ID del Resource asignado en AutoTask');
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::table('ticket_assignments', function (Blueprint $table) {
            $table->unique(['ticket_id', 'assigned_resource_autotask_id']);
            $table->index('assigned_resource_autotask_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_assignments');
    }
};
