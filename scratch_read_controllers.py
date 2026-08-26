import glob
import os

controller_files = [
    "AuthController.java",
    "UserController.java",
    "StaffController.java",
    "ProductController.java",
    "CategoryController.java",
    "SupplierController.java",
    "ImportOrderController.java",
    "ImportReturnController.java",
    "ImportHistoryController.java",
    "StorageLocationController.java",
    "InventoryAttentionController.java",
    "StockBatchController.java",
    "InventoryCheckController.java",
    "SalesOrderController.java",
    "SalesHistoryController.java",
    "CustomerController.java",
    "DebtPaymentController.java"
]

base_dir = r"BE_SEP490_G67\src\main\java\project\be_sep490_g67\controller"

for fname in controller_files:
    fpath = os.path.join(base_dir, fname)
    if os.path.exists(fpath):
        print(f"\n=================== {fname} ===================")
        with open(fpath, "r", encoding="utf-8") as f:
            print(f.read())
