import { Card, CardHeader } from '../components/ui/Card';

export default function SettingsPage() {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader title="System Settings" subtitle="Configure platform-wide settings" />
                <div className="p-4 pt-0 text-sm text-gray-500">
                    Configuration options for the HRMS system will appear here.
                </div>
            </Card>
        </div>
    );
}
