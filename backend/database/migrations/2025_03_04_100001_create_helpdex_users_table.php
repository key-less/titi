<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Usuarios de HELPDEX para login (futuro).
     * Cada usuario se vincula a un Resource de AutoTask (autotask_resources).
     */
    public function up(): void
    {
        Schema::create('helpdex_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('autotask_resource_id')->unique()->comment('FK a autotask_resources.autotask_id');
            $table->string('name')->nullable()->comment('Nombre para mostrar (copiado o derivado del resource)');
            $table->string('email')->nullable();
            $table->string('password')->nullable()->comment('Hash; nullable hasta implementar login');
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::table('helpdex_users', function (Blueprint $table) {
            $table->foreign('autotask_resource_id')
                ->references('autotask_id')
                ->on('autotask_resources')
                ->onDelete('cascade');
            $table->index('email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('helpdex_users');
    }
};
