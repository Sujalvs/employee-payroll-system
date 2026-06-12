const express = require("express");

module.exports = function (db) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const today = new Date().toISOString().split("T")[0];

    db.get(
      "SELECT COUNT(*) AS totalEmployees FROM employees",
      [],
      (err, employeeResult) => {
        if (err) return res.status(500).json(err);

        db.get(
          `
          SELECT COUNT(*) AS presentToday
          FROM attendance
          WHERE date = ? AND status = 'Present'
          `,
          [today],
          (err, presentResult) => {
            if (err) return res.status(500).json(err);

            db.get(
              `
              SELECT COUNT(*) AS absentToday
              FROM attendance
              WHERE date = ? AND status = 'Absent'
              `,
              [today],
              (err, absentResult) => {
                if (err) return res.status(500).json(err);

                db.get(
                  `
                  SELECT
                    SUM(employees.wage) AS totalPayroll
                  FROM employees
                  `,
                  [],
                  (err, payrollResult) => {
                    if (err) return res.status(500).json(err);

                    res.json({
                      totalEmployees:
                        employeeResult.totalEmployees || 0,

                      presentToday:
                        presentResult.presentToday || 0,

                      absentToday:
                        absentResult.absentToday || 0,

                      totalPayroll:
                        payrollResult.totalPayroll || 0,
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  return router;
};