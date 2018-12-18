// Generated by CoffeeScript 2.3.2
var Connection, assert, async, mysql;

assert = require('chai').assert;

async = require('async');

mysql = require('../lib/index')({
  user: process.env.MYSQL_USER || 'root',
  host: process.env.MYSQL_HOST || '127.0.0.1',
  password: process.env.MYSQL_PASSWORD || '',
  connectionLimit: 10,
  database: 'mysql',
  port: process.env.MYSQL_PORT || 3306
});

Connection = mysql.connection;

suite('Query', function() {
  before(function(done) {
    var q;
    q = new Connection;
    return async.series([
      function(c) {
        return q.q({
          q: 'CREATE DATABASE IF NOT EXISTS test',
          cb: c
        });
      },
      function(c) {
        return q.q({
          q: 'CREATE TABLE IF NOT EXISTS test.innodb_deadlock_maker(a INT PRIMARY KEY) ENGINE=innodb',
          cb: c
        });
      },
      function(c) {
        return q.q({
          q: 'CREATE TABLE test.lockTest (test varchar(30))',
          cb: c
        });
      },
      function(c) {
        return q.q({
          q: 'TRUNCATE TABLE test.lockTest',
          cb: c
        });
      },
      function(c) {
        return q.q({
          q: 'INSERT INTO test.lockTest VALUES ("test")',
          cb: c
        });
      },
      function(c) {
        return q.end(c);
      }
    ], done);
  });
  test('select', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1 AS k',
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(done);
      }
    });
  });
  test('select-params', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT ? AS k',
      params: [1],
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(done);
      }
    });
  });
  test('select-aliases', function(done) {
    var q;
    q = new Connection;
    return q.q({
      sql: 'SELECT ? AS k',
      values: [1],
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(done);
      }
    });
  });
  test('lock1', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1 AS k',
      lock: 1,
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(done);
      }
    });
  });
  test('lock2', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1 AS k',
      lock: 2,
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(done);
      }
    });
  });
  test('lock-functions', function(done) {
    var q, q2;
    q = new Connection(true);
    q2 = new Connection(true);
    return q.row({
      q: 'SELECT * FROM test.lockTest',
      lock: 2,
      cb: function(err, data) {
        q2.row({
          q: 'SELECT * FROM test.lockTest',
          lock: 2,
          cb: function(err, data) {
            assert.equal('test2', data.test);
            return q2.end(done);
          }
        });
        assert.equal('test', data.test);
        return q.q({
          q: 'UPDATE test.lockTest SET test="test2"',
          cb: function() {
            return setTimeout(function() {
              return q.end(function() {
                return null;
              });
            }, 100);
          }
        });
      }
    });
  });
  test('stream', function(done) {
    var q, result, stream;
    q = new Connection;
    result = 0;
    stream = function(row) {
      return result = row.k;
    };
    return q.q({
      q: 'SELECT 1 AS k',
      lock: 2,
      stream: stream,
      cb: function() {
        assert.equal(1, result);
        return q.end(done);
      }
    });
  });
  test('end', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1 AS k',
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(function() {
          return q.end(done);
        });
      }
    });
  });
  test('endwithops', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1 AS k',
      cb: function(err, data) {
        assert.equal(data[0].k, 1);
        return q.end(function() {
          return q.end({
            timeout: 30000
          }, done);
        });
      }
    });
  });
  test('commit', function(done) {
    var q;
    q = new Connection;
    return q.begin(function() {
      return q.q({
        q: 'SELECT 1 AS k',
        cb: function(err, data) {
          assert.equal(data[0].k, 1);
          return q.commit(function() {
            return q.end(done);
          });
        }
      });
    });
  });
  test('timeout', function(done) {
    var q;
    q = new Connection;
    q.on('error', function(err) {
      return null;
    });
    return q.begin(function() {
      return q.q({
        q: 'SELECT SLEEP(10)',
        timeout: 1,
        cb: function(err, data) {
          assert.equal(err.code, 'PROTOCOL_SEQUENCE_TIMEOUT');
          return done();
        }
      });
    });
  });
  test('error', function(done) {
    var q;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    return q.q({
      q: 'SELECT 1 AS k FROM no_table',
      cb: function(err, data) {
        assert.equal(err.code, 'ER_NO_SUCH_TABLE');
        return done();
      }
    });
  });
  test('streamerror', function(done) {
    var q, result, stream;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    result = 0;
    stream = function(row) {
      return result = row.k;
    };
    return q.q({
      q: 'SELECT 1 AS k FROM no_table',
      lock: 2,
      stream: stream,
      cb: function(err) {
        assert.equal(err.code, 'ER_NO_SUCH_TABLE');
        return done();
      }
    });
  });
  test('batch', function(done) {
    var q, queries;
    q = new Connection;
    queries = [];
    queries.push({
      q: 'SELECT 1 AS k'
    });
    queries.push({
      q: 'SELECT 2 AS k'
    });
    return q.batch(queries, function(err, data) {
      assert.equal(data[0][0].k, 1);
      assert.equal(data[1][0].k, 2);
      return q.end(done);
    });
  });
  test('batcherror', function(done) {
    var q, queries;
    q = new Connection;
    queries = [];
    q.on('error', function() {
      return null;
    });
    return q.batch(queries, function(err, data) {
      assert.equal(err.message, 'Cannot batch 0 queries');
      return done();
    });
  });
  test('batcherror2', function(done) {
    var q, queries;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    queries = [];
    queries.push({
      q: 'SELECT 1 AS k FROM no_table'
    });
    return q.batch(queries, function(err, data) {
      assert.equal(err.code, 'ER_NO_SUCH_TABLE');
      return done();
    });
  });
  test('enqueue', function(done) {
    var qs;
    qs = [];
    mysql.pool.once('enqueue', function() {
      assert.equal(mysql.pool._connectionQueue.length, 1);
      return async.each(qs, function(q, c) {
        return q.end(c);
      }, done);
    });
    return async.whilst(function() {
      return mysql.pool._allConnections.length <= 10;
    }, function(c) {
      var q;
      q = new Connection;
      qs.push(q);
      return q.begin(c);
    });
  });
  test('logs', function(done) {
    var q;
    q = new Connection;
    q.log = true;
    return q.q({
      q: 'SELECT 1 AS k',
      cb: function(err, data) {
        assert.equal(q.logs[0].q, 'SELECT 1 AS k');
        return q.end(done);
      }
    });
  });
  test('row', function(done) {
    var q;
    q = new Connection;
    return q.row({
      q: 'SELECT 1 AS k',
      cb: function(err, data) {
        assert.equal(data.k, 1);
        return q.end(done);
      }
    });
  });
  test('count', function(done) {
    var q;
    q = new Connection;
    return q.count({
      q: 'SELECT count(*)',
      cb: function(err, data) {
        assert.equal(data, 1);
        return q.end(done);
      }
    });
  });
  test('warningsAreErrors', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'CREATE TEMPORARY TABLE warnings_test (test_col VARCHAR(5));',
      cb: function(err) {
        if (err) {
          throw err;
        }
        q.on('error', function() {
          return null;
        });
        return q.q({
          q: 'INSERT INTO warnings_test SET test_col="123456"',
          warningsAreErrors: true,
          cb: function(err) {
            assert.equal(err.message, 'Warnings treated as errors 1');
            assert.equal(err.warnings[0].Message, "Data truncated for column 'test_col' at row 1");
            return done();
          }
        });
      }
    });
  });
  test('warningsAreErrorsNotEnabled', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'CREATE TEMPORARY TABLE IF NOT EXISTS warnings_test (test_col VARCHAR(5));',
      cb: function(err) {
        if (err) {
          throw err;
        }
        return q.q({
          q: 'INSERT INTO warnings_test SET test_col="123456"',
          cb: function(err) {
            assert.isNull(err);
            return q.end(done);
          }
        });
      }
    });
  });
  test('deadlocks', function(done) {
    var deadlocks, q, q2;
    q = new Connection(true);
    q2 = new Connection(true);
    deadlocks = 0;
    q2.on('deadlock', function() {
      return deadlocks += 1;
    });
    return async.series([
      function(c) {
        return q.q({
          q: 'SET autocommit=0',
          cb: c
        });
      },
      function(c) {
        return q2.q({
          q: 'SET autocommit=0',
          cb: c
        });
      },
      function(c) {
        return q.q({
          q: 'INSERT INTO test.innodb_deadlock_maker VALUES(1)',
          cb: c
        });
      },
      function(c) {
        q2.q({
          q: 'SELECT * FROM test.innodb_deadlock_maker FOR UPDATE',
          cb: function() {
            assert.equal(deadlocks,
      1);
            return q2.end(done);
          }
        });
        return setTimeout(c,
      1000);
      },
      function(c) {
        return q.q({
          q: 'INSERT INTO test.innodb_deadlock_maker VALUES(0);',
          cb: c
        });
      },
      function(c) {
        return q.end(c);
      }
    ]);
  });
  test('statsSelect', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'SELECT 1',
      cb: function(err) {
        if (err) {
          throw err;
        }
        assert.equal(q.stats.select, 1);
        return q.end(done);
      }
    });
  });
  test('statsInsert', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'INSERT INTO test.lockTest VALUES("insert")',
      cb: function(err) {
        if (err) {
          throw err;
        }
        assert.equal(q.stats.insert, 1);
        return q.end(done);
      }
    });
  });
  test('statsUpdate', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: 'UPDATE test.lockTest SET test="update"',
      cb: function(err) {
        if (err) {
          throw err;
        }
        assert.equal(q.stats.update, 1);
        return q.end(done);
      }
    });
  });
  test('statsDelete', function(done) {
    var q;
    q = new Connection;
    return q.q({
      q: "DELETE FROM test.lockTest",
      cb: function(err) {
        if (err) {
          throw err;
        }
        assert.equal(q.stats.delete, 1);
        return q.end(done);
      }
    });
  });
  test('statsSelectDisabled', function(done) {
    var q;
    q = new Connection;
    q.gatherStats = false;
    return q.q({
      q: "SELECT 1",
      cb: function(err) {
        if (err) {
          throw err;
        }
        assert.equal(q.stats.select, 0);
        return q.end(done);
      }
    });
  });
  test('testRowWithoutResults', function(done) {
    var q;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    return q.row({
      q: 'SELECT pie FROM cake',
      cb: function(err, data) {
        assert.equal(data, null);
        return done();
      }
    });
  });
  test('testCountWithoutResults', function(done) {
    var q;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    return q.count({
      q: 'SELECT cake FROM pie',
      cb: function(err, data) {
        assert.equal(data, null);
        return done();
      }
    });
  });
  test('testNoReconnect', function(done) {
    var q;
    q = new Connection;
    q.on('error', function() {
      return null;
    });
    return q.count({
      q: 'SELECT 1',
      cb: function(err, data) {
        assert.equal(data, 1);
        assert.equal(q.connectionAttempts, 1);
        return done();
      }
    });
  });
  test('testReconnect', function(done) {
    var ConnectionTmp, mysqlTmp, q;
    mysqlTmp = require('../lib/index')({
      user: process.env.MYSQL_USER || 'root',
      host: process.env.MYSQL_HOST || '127.0.0.1',
      password: process.env.MYSQL_PASSWORD || '',
      connectionLimit: 10,
      database: 'mysql',
      port: process.env.MYSQL_PORT || 3306
    });
    ConnectionTmp = mysqlTmp.connection;
    q = new Connection;
    return q.q({
      q: 'SET GLOBAL max_connections = 1',
      cb: function() {
        var qTmp;
        qTmp = new ConnectionTmp;
        qTmp.on('error', function() {
          return null;
        });
        setTimeout(function() {
          return q.q({
            q: 'SET GLOBAL max_connections = 1000',
            cb: function() {
              return q.end(function() {
                return null;
              });
            }
          });
        }, 300);
        return qTmp.count({
          q: 'SELECT 1',
          cb: function(err, data) {
            assert.equal(data, 1);
            assert.equal(qTmp.connectionAttempts, 2);
            return done();
          }
        });
      }
    });
  });
  return test('testFailedReconnect', function(done) {
    var ConnectionTmp, mysqlTmp, q;
    mysqlTmp = require('../lib/index')({
      user: process.env.MYSQL_USER || 'root',
      host: process.env.MYSQL_HOST || '127.0.0.1',
      password: process.env.MYSQL_PASSWORD || '',
      connectionLimit: 10,
      database: 'mysql',
      port: process.env.MYSQL_PORT || 3306
    });
    ConnectionTmp = mysqlTmp.connection;
    q = new Connection;
    return q.q({
      q: 'SET GLOBAL max_connections = 1',
      cb: function() {
        var qTmp;
        qTmp = new ConnectionTmp;
        qTmp.on('error', function() {
          return null;
        });
        return qTmp.count({
          q: 'SELECT 1',
          cb: function(err, data) {
            assert.equal(qTmp.connectionAttempts, 4);
            assert.equal(err.code, 'ER_CON_COUNT_ERROR');
            return q.q({
              q: 'SET GLOBAL max_connections = 1000',
              cb: function() {
                return q.end(done);
              }
            });
          }
        });
      }
    });
  });
});
