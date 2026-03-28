const { expect } = require('chai');
const sequelize = require('../server/db');

describe('PostgreSQL деректер базасына қосылуды тексеру', () => {

  after(async () => {
    await sequelize.close();
  });

  it('db.js сәтті экспортталды және Sequelize данасы болып табылады', () => {
    expect(sequelize).to.be.an('object');
    expect(sequelize).to.have.property('authenticate');
    expect(sequelize).to.have.property('query');
  });

  it('Деректер базасы қосылымды растайды (authenticate)', async () => {
    try {
      await sequelize.authenticate();
      console.log('   ✅ Деректер базасымен байланыс сәтті орнатылды!');
    } catch (err) {
      throw new Error(`Деректер базасына қосылу мүмкін болмады: ${err.message}`);
    }
  });

  it('Деректер базасы қарапайым сұранысқа жауап береді (SELECT 1)', async () => {
    const [results] = await sequelize.query('SELECT 1 + 1 AS sum');
    expect(results[0].sum).to.equal(2);
  });


});