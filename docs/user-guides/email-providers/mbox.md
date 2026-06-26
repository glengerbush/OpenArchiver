# Mbox Ingestion

Mbox is a common format for storing email messages. This guide will walk you through the process of ingesting mbox files into OpenArchiver.

## 1. Exporting from Your Email Client

Most email clients that support mbox exports will allow you to export a folder of emails as a single `.mbox` file. Here are the general steps:

- **Mozilla Thunderbird**: Right-click on a folder, select **ImportExportTools NG**, and then choose **Export folder**.
- **Gmail**: You can use Google Takeout to export your emails in mbox format.
- **Other Clients**: Refer to your email client's documentation for instructions on how to export emails to an mbox file.

## 2. Uploading to OpenArchiver

Once you have your `.mbox` file or a folder of `.mbox` files, you can import it through the web interface.

1.  Navigate to the **Ingestion** page.
2.  Click on the **New Ingestion** button.
3.  Select **Mbox** as the source type.
4.  **Choose Import Method:**
    - **Upload File:** Upload one `.mbox` file.
    - **Local Path:** Enter the path to one `.mbox` file or a folder containing `.mbox` files **inside the container**. Folder imports are scanned recursively, so subfolders are included.

    > **Note on Local Path:** When using Docker, the "Local Path" is relative to the container's filesystem.
    >
    > - **Recommended:** Place your mbox file or mbox folder in a `temp` folder inside your configured storage directory (`STORAGE_LOCAL_ROOT_PATH`). This path is already mounted. For example, if your storage path is `/data`, put files under `/data/temp/mbox-import/` and enter `/data/temp/mbox-import` as the path.
    > - **Alternative:** Mount a separate volume in `docker-compose.yml` (e.g., `- /host/path:/container/path`) and use the container path.

## 3. Folder Structure

OpenArchiver will attempt to preserve the original folder structure of your emails. This is done by inspecting the following email headers:

- `X-Gmail-Labels`: Used by Gmail to store labels.
- `X-Folder`: A custom header used by some email clients like Thunderbird.

If neither of these headers is present, a single uploaded or local file is ingested into the root of the archive. For a local folder import, OpenArchiver uses each `.mbox` file's relative path as the fallback folder. For example, `/data/temp/mbox-import/Clients/acme.mbox` imports to `Clients/acme`.
