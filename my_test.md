docker compose exec -T app php artisan tinker --execute="\$updated = DB::table('users')->where('email', 'receiver.test@myleaseaudit.com')->update(['email' => 'abdul.aziz@cubettech.com']); echo 'Updated rows: ' . \$updated;"


amazon rd download db:


mysqldump \
  --host=myleaseaudit.chdlpkk0pbih.us-east-1.rds.amazonaws.com \
  --port=3210 \
  --user=myleaseaudit \
  --password \
  --single-transaction \
  --skip-lock-tables \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  myleaseaudit_db > rds_backup_$(date +%Y%m%d_%H%M%S).sql



  dev region:

  mysqldump \
  --host=myleaseauditdb-staging.chdlpkk0pbih.us-east-1.rds.amazonaws.com \
  --port=3306 \
  --user=mylease \
  --password \
  --single-transaction \
  --skip-lock-tables \
  --set-gtid-purged=OFF \
  --no-tablespaces \
  myleaseauditdb > rds_backup_$(date +%Y%m%d_%H%M%S).sql



  list mysql preveliges:

  c864@CBTL-118:~/Downloads$ mysql -h myleaseaudit.chdlpkk0pbih.us-east-1.rds.amazonaws.com -P 3210 -u myleaseaudit -p -e "SHOW GRANTS FOR CURRENT_USER();"
Enter password: 
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Grants for myleaseaudit@%                                                                                                                                                                                                                                                                                                                                      |
+----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, PROCESS, REFERENCES, INDEX, ALTER, SHOW DATABASES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, CREATE ROLE, DROP ROLE ON *.* TO `myleaseaudit`@`%` WITH GRANT OPTION |
| GRANT APPLICATION_PASSWORD_ADMIN,FLUSH_OPTIMIZER_COSTS,FLUSH_STATUS,FLUSH_TABLES,FLUSH_USER_RESOURCES,INNODB_REDO_LOG_ARCHIVE,PASSWORDLESS_USER_ADMIN,ROLE_ADMIN,SENSITIVE_VARIABLES_OBSERVER,SESSION_VARIABLES_ADMIN,SET_USER_ID,SHOW_ROUTINE,XA_RECOVER_ADMIN ON *.* TO `myleaseaudit`@`%` WITH GRANT OPTION                                                 |
| GRANT `rds_superuser_role`@`%` TO `myleaseaudit`@`%`   




Challan Number :	KL4124053260113040914	Amount :	500.00
Vehicle Number :	KL58AE8867	Status :	Success
Transaction ID :	KL080926E0632827	Payment Transaction Number :	460Z2609087476937
Bank Reference Number :	E26090815ZE2IO	Payment Date :	2026-09-08 17:01:47
Reason :	SUCCESS		
Please note transaction id for future reference


docker cp ~/Downloads/backup.sql $(docker compose ps -q db):/tmp/backup.sql

Check that it exists:
docker compose exec db ls -lh /tmp/backup.sql

docker compose exec db mysql -u root -p
USE myleaseauditdb;
SOURCE /tmp/backup.sql;


docker compose up -d
docker compose exec <laravel-service> php artisan config:clear
docker compose exec <laravel-service> php artisan cache:clear


http://192.168.112.2:3000/discussions/


we have adddress filter dropdown plz show complete address

Wake County, North Carolina, United States, 27519 this much for this

Circle on the Green, Wake County, North Carolina, United States, 27519




todo:

1. https://app.clickup.com/t/37273966/86d4a4ng2
2. https://app.clickup.com/t/37273966/86d4a4qwg
3. https://app.clickup.com/t/37273966/86d4a4b4a need smooth focus on text arae
4. https://app.clickup.com/t/37273966/86d4bbx12 need make better user experience


1. when mentioning in the discussion currently we are showing like this @[Aneesh G](484)   that make confussion in the user plz make user name only Aneesh G