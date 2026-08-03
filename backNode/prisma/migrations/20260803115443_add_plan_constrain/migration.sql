/*
  Warnings:

  - A unique constraint covering the columns `[name,interval]` on the table `Plan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Plan_name_interval_key` ON `Plan`(`name`, `interval`);
