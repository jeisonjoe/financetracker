/**
 * Abstract base contract for repositories.
 * Subclasses must implement all domain persistence operations.
 */
export class BaseRepository {
  notImplemented(methodName) {
    throw new Error(
      `${this.constructor.name}.${methodName}() must be implemented by subclass`
    );
  }
}

export class IAuthProvider extends BaseRepository {
  async getSessionUser() { this.notImplemented("getSessionUser"); }
  async signIn(_email, _password) { this.notImplemented("signIn"); }
  async signUp(_payload) { this.notImplemented("signUp"); }
  async signOut() { this.notImplemented("signOut"); }
  async requestPasswordReset(_email, _origin) { this.notImplemented("requestPasswordReset"); }
  async resetPassword(_payload) { this.notImplemented("resetPassword"); }
  async updateProfile(_userId, _profile) { this.notImplemented("updateProfile"); }
}

export class ITransactionRepository extends BaseRepository {
  async findByUser(_userId, _options) { this.notImplemented("findByUser"); }
  async findInDateRange(_userId, _startIso, _endIso, _type) { this.notImplemented("findInDateRange"); }
  async findById(_id, _userId) { this.notImplemented("findById"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
  async bulkUpsertByExternalId(_userId, _items) { this.notImplemented("bulkUpsertByExternalId"); }
}

export class ICategoryRepository extends BaseRepository {
  async findAllForUser(_userId) { this.notImplemented("findAllForUser"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
  async seedDefaultsIfEmpty(_userId, _defaults) { this.notImplemented("seedDefaultsIfEmpty"); }
}

export class IWalletRepository extends BaseRepository {
  async findAllForUser(_userId) { this.notImplemented("findAllForUser"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
  async seedDefaultsIfEmpty(_userId, _defaults) { this.notImplemented("seedDefaultsIfEmpty"); }
}

export class IFundGoalRepository extends BaseRepository {
  async findAllForUser(_userId) { this.notImplemented("findAllForUser"); }
  async findById(_id, _userId) { this.notImplemented("findById"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
}

export class IRecurringItemRepository extends BaseRepository {
  async findAllForUser(_userId) { this.notImplemented("findAllForUser"); }
  async findById(_id, _userId) { this.notImplemented("findById"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
}

export class IFundPlanRepository extends BaseRepository {
  async findForUser(_userId) { this.notImplemented("findForUser"); }
  async upsert(_userId, _payload) { this.notImplemented("upsert"); }
}

export class IMerchantRuleRepository extends BaseRepository {
  async findAllForUser(_userId) { this.notImplemented("findAllForUser"); }
  async create(_userId, _payload) { this.notImplemented("create"); }
  async update(_id, _userId, _payload) { this.notImplemented("update"); }
  async delete(_id, _userId) { this.notImplemented("delete"); }
}

