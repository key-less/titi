<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cache de Resources de AutoTask para login y sincronización.
     * Almacena todos los datos posibles del recurso (incl. raw_json para campos extra).
     */
    public function up(): void
    {
        Schema::create('autotask_resources', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('autotask_id')->unique()->comment('ID del Resource en AutoTask');
            $table->string('first_name', 50)->nullable();
            $table->string('last_name', 50)->nullable();
            $table->string('middle_name', 50)->nullable();
            $table->string('email', 254)->nullable();
            $table->string('user_name', 32)->nullable()->comment('Username en AutoTask Security');
            $table->string('office_phone', 25)->nullable();
            $table->string('office_extension', 10)->nullable();
            $table->string('mobile_phone', 25)->nullable();
            $table->string('home_phone', 25)->nullable();
            $table->string('title', 50)->nullable()->comment('Job title');
            $table->string('initials', 32)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('user_type')->nullable()->comment('Security level / license type');
            $table->integer('location_id')->nullable();
            $table->date('hire_date')->nullable();
            $table->decimal('internal_cost', 10, 2)->nullable();
            $table->string('resource_type', 15)->nullable();
            $table->jsonb('raw_json')->nullable()->comment('Resto de campos de la API para no perder datos');
            $table->timestamp('synced_at')->nullable()->comment('Última sincronización desde AutoTask');
            $table->timestamps();
        });

        Schema::table('autotask_resources', function (Blueprint $table) {
            $table->index('is_active');
            $table->index('user_name');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('autotask_resources');
    }
};
