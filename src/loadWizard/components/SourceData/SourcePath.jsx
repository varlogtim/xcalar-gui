import React from "react";
import { FileType } from '../../services/SchemaService'
import InputDropdown from "../../../components/widgets/InputDropdown"
import NavButtons from '../NavButtons'

const Texts = {
    bucketName: 'S3 Bucket Name:',
    path: 'Path:',
    fileType: 'File Type:',
    typeCsv: 'CSV',
    typeJson: 'JSON',
    typeParquet: 'Parquet',
    navButtonRight: 'Browse'
};

const fileTypeNames = new Map([
    [FileType.CSV, Texts.typeCsv],
    [FileType.JSON, Texts.typeJson],
    [FileType.PARQUET, Texts.typeParquet],
]);

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    fileType = FileType.CSV,
    onFileTypeChange = (newType) => {},
    onNextScreen
}) {
    const s3Bucket = DSTargetManager.getAvailableS3Bucket();
    return (
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <div className="bucketSelection">
                    <div className="fieldWrap">
                        <label className="label">{Texts.bucketName}</label>
                        <InputDropdown
                            val={bucket}
                            onInputChange={(newBucket) => {
                                onBucketChange(newBucket.trim());
                            }}
                            onSelect={(newBucket) => {
                                onBucketChange(newBucket.trim());
                            }}
                            list={[
                                {text: s3Bucket, value: s3Bucket}
                            ]}
                        />
                    </div>
                </div>
                <div className="pathSelection">
                    <div className="fieldWrap">
                        <label className="label">{Texts.path}</label>
                        <input
                            className="xc-input input"
                            type="text"
                            value={path}
                            onChange={(e) => { onPathChange(e.target.value.trim()); }}
                        />
                    </div>
                    <NavButtons right={{ label: Texts.navButtonRight, onClick: () => { onNextScreen() } }} />
                </div>
                <div className="fileTypeSelection">
                    <label className="label">{Texts.fileType}</label>
                    <InputDropdown
                        val={fileType}
                        onInputChange={(type) => {
                            onFileTypeChange(type);
                        }}
                        onSelect={(type) => {
                            onFileTypeChange(type);
                        }}
                        list={
                            [FileType.CSV, FileType.JSON, FileType.PARQUET].map((type) => {
                                return {text: type, value: type};
                            })
                        }
                        readOnly
                    />
                </div>
            </form>
        </div>
    );
}
