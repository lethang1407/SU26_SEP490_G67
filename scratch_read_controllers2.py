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
out_file = r"scratch_controllers_dump.txt"

with open(out_file, "w", encoding="utf-8") as out:
    for fname in controller_files:
        fpath = os.path.join(base_dir, fname)
        if os.path.exists(fpath):
            out.write(f"\n=================== {fname} ===================\n")
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                out.write(f.read())
