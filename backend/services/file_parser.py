import os
import csv
import json
import io
import re
import chardet
import requests
import pandas as pd
from fastapi import HTTPException
import pdfplumber


class FileParser:
    @staticmethod
    def parse(file_path: str, file_extension: str) -> pd.DataFrame:
        ext = file_extension.lower().lstrip(".")
        if ext == "csv":
            return FileParser._parse_csv(file_path)
        elif ext in ("xlsx", "xls"):
            return FileParser._parse_excel(file_path)
        elif ext == "json":
            return FileParser._parse_json(file_path)
        elif ext == "txt":
            return FileParser._parse_txt(file_path)
        elif ext == "pdf":
            return FileParser._parse_pdf(file_path)
        elif ext == "sql":
            return FileParser._parse_sql(file_path)
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported file format: .{ext}. Supported formats: CSV, Excel, JSON, PDF, TXT, SQL",
            )

    @staticmethod
    def parse_from_url(url: str) -> pd.DataFrame:
        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "json" in content_type:
                return FileParser._parse_json_content(resp.text)
            elif "csv" in content_type or "text" in content_type:
                return FileParser._parse_csv_content(resp.text)
            else:
                # Try JSON first, then CSV
                try:
                    return FileParser._parse_json_content(resp.text)
                except Exception:
                    return FileParser._parse_csv_content(resp.text)
        except requests.RequestException as e:
            raise HTTPException(status_code=422, detail=f"Failed to fetch URL: {str(e)}")

    @staticmethod
    def _parse_csv(file_path: str) -> pd.DataFrame:
        with open(file_path, "rb") as f:
            raw = f.read()
        detected = chardet.detect(raw)
        encoding = detected.get("encoding", "utf-8") or "utf-8"
        try:
            df = pd.read_csv(file_path, encoding=encoding)
        except UnicodeDecodeError:
            df = pd.read_csv(file_path, encoding="latin1")
        if df.empty:
            raise HTTPException(status_code=422, detail="CSV file contains no data")
        return df

    @staticmethod
    def _parse_csv_content(content: str) -> pd.DataFrame:
        lines = content.strip().split("\n")
        dialect = csv.Sniffer().sniff(lines[0])
        df = pd.read_csv(io.StringIO(content), dialect=dialect)
        if df.empty:
            raise HTTPException(status_code=422, detail="CSV content contains no data")
        return df

    @staticmethod
    def _parse_excel(file_path: str) -> pd.DataFrame:
        try:
            xls = pd.ExcelFile(file_path)
            sheet_name = xls.sheet_names[0]
            df = pd.read_excel(file_path, sheet_name=sheet_name)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse Excel file: {str(e)}")
        if df.empty:
            raise HTTPException(status_code=422, detail="Excel file contains no data")
        return df

    @staticmethod
    def _parse_json(file_path: str) -> pd.DataFrame:
        with open(file_path, "r") as f:
            content = f.read()
        return FileParser._parse_json_content(content)

    @staticmethod
    def _parse_json_content(content: str) -> pd.DataFrame:
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=422, detail=f"Invalid JSON: {str(e)}")

        if isinstance(data, list):
            if all(isinstance(item, dict) for item in data):
                df = pd.json_normalize(data)
            else:
                df = pd.DataFrame(data)
        elif isinstance(data, dict):
            # Try to find array in dict
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0:
                    if isinstance(value[0], dict):
                        df = pd.json_normalize(value)
                        break
                    else:
                        df = pd.DataFrame(value)
                        break
            else:
                df = pd.json_normalize([data])
        else:
            raise HTTPException(status_code=422, detail="JSON must contain an array or object")

        if df.empty:
            raise HTTPException(status_code=422, detail="JSON contains no data")
        return df

    @staticmethod
    def _parse_txt(file_path: str) -> pd.DataFrame:
        with open(file_path, "rb") as f:
            raw = f.read()
        detected = chardet.detect(raw)
        encoding = detected.get("encoding", "utf-8") or "utf-8"
        try:
            with open(file_path, "r", encoding=encoding) as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(file_path, "r", encoding="latin1") as f:
                content = f.read()

        lines = [line.strip() for line in content.split("\n") if line.strip()]
        if not lines:
            raise HTTPException(status_code=422, detail="Text file is empty")

        # Try CSV
        try:
            dialect = csv.Sniffer().sniff(lines[0])
            df = pd.read_csv(io.StringIO(content), dialect=dialect)
            if df.shape[1] > 1:
                return df
        except Exception:
            pass

        # Try TSV
        if "\t" in lines[0]:
            try:
                df = pd.read_csv(io.StringIO(content), sep="\t")
                if df.shape[1] > 1:
                    return df
            except Exception:
                pass

        # Line by line
        df = pd.DataFrame({f"text": lines})
        return df

    @staticmethod
    def _parse_pdf(file_path: str) -> pd.DataFrame:
        try:
            with pdfplumber.open(file_path) as pdf:
                all_dfs = []
                for page in pdf.pages:
                    tables = page.extract_tables()
                    for table in tables:
                        if table:
                            headers = table[0]
                            rows = table[1:]
                            df = pd.DataFrame(rows, columns=headers)
                            all_dfs.append(df)

                if all_dfs:
                    df = pd.concat(all_dfs, ignore_index=True)
                    return df

                # Fallback: extract text
                text_content = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content += text + "\n"

                if text_content.strip():
                    lines = [l.strip() for l in text_content.split("\n") if l.strip()]
                    df = pd.DataFrame({f"text": lines})
                    return df

                raise HTTPException(status_code=422, detail="No extractable content found in PDF")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {str(e)}")

    @staticmethod
    def _parse_sql(file_path: str) -> pd.DataFrame:
        with open(file_path, "r") as f:
            content = f.read()

        # Check for INSERT statements
        insert_pattern = re.compile(
            r"INSERT\s+INTO\s+\S+\s*(?:\([^)]*\))?\s*VALUES\s*\((.*?)\);",
            re.IGNORECASE | re.DOTALL,
        )
        matches = insert_pattern.findall(content)

        if matches:
            rows = []
            for match in matches:
                # Split by comma but respect string literals
                values = re.split(r",(?=(?:[^']*'[^']*')*[^']*$)", match)
                values = [v.strip().strip("'") for v in values]
                rows.append(values)

            if rows:
                max_cols = max(len(r) for r in rows)
                for r in rows:
                    while len(r) < max_cols:
                        r.append("")
                columns = [f"col_{i+1}" for i in range(max_cols)]
                df = pd.DataFrame(rows, columns=columns)
                return df

        # Try treating as query (not implemented - return single column)
        df = pd.DataFrame({"sql_content": content.split("\n")})
        return df