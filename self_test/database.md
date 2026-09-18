docker exec -it myleaseaudit_app php artisan tinker
User::all();
User::all(['id', 'first_name', 'last_name', 'email', 'role_id', 'status']);
User::where('email', 'qloop@qloop.com')->first();
App\Models\Company::all();




docker exec myleaseaudit_app php artisan tinker --execute="User::all(['id', 'email', 'first_name', 'last_name', 'status']);"



docker exec myleaseaudit_app php artisan config:clear && docker exec myleaseaudit_app php -r "require 'vendor/autoload.php'; \$app = require_once 'bootstrap/app.php'; \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class); \$kernel->bootstrap(); var_dump(config('database.connections.mysql.database'));"